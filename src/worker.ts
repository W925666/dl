// src/worker.ts  (KV SAFE VERSION)

interface Env {
  METADATA: KVNamespace;
  ASSETS: Fetcher;
  ADMIN_PASSWORD: string;
  ADMIN_PATH: string;
  SITE_NAME: string;
  TELEGRAM_BOT: string;
  FOOTER_TEXT: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS, DELETE",
};

const META_CACHE_TTL = 3600;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateId(len = 8) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return [...arr].map(v => chars[v % chars.length]).join("");
}

function isAllowedFile(_filename: string, mime: string) {
  return !(mime.startsWith("image/") || mime.startsWith("video/") || mime.startsWith("audio/"));
}

async function handleUpload(req: Request, env: Env) {
  const ct = req.headers.get("Content-Type") || "";
  let content = "";
  let filename = "file";
  let mime = "application/octet-stream";
  let type = "file"; // file, text, subscription

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file") as File;
    if (!file) return json({ error: "No file" }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ error: "Too large" }, 400);
    if (!isAllowedFile(file.name, file.type)) return json({ error: "File type blocked" }, 400);
    filename = file.name;
    mime = file.type || mime;
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i += 32768) {
      bin += String.fromCharCode(...buf.subarray(i, i + 32768));
    }
    content = btoa(bin);
  } else {
    const body = await req.json();
    content = body.content || "";
    filename = body.filename || "text.txt";
    mime = body.contentType || "text/plain";
    type = body.type || "text"; // 获取类型：text 或 subscription
  }

  const id = generateId();
  const meta = { id, filename, contentType: mime, size: content.length, type, createdAt: new Date().toISOString() };
  await env.METADATA.put("content:" + id, content);
  await env.METADATA.put("meta:" + id, JSON.stringify(meta));
  
  // 根据类型返回不同的 URL
  const url = type === "subscription" ? "/sub/" + id : "/raw/" + id;
  return json({ id, url });
}


async function getMeta(env: Env, id: string) {
  const str = await env.METADATA.get("meta:" + id, { cacheTtl: META_CACHE_TTL });
  return str ? JSON.parse(str) : null;
}

async function getContent(env: Env, id: string) {
  return env.METADATA.get("content:" + id, { cacheTtl: META_CACHE_TTL });
}

async function handleRaw(id: string, env: Env) {
  const meta = await getMeta(env, id);
  if (!meta) return new Response("Not found", { status: 404 });
  const content = await getContent(env, id);
  if (!content) return new Response("No content", { status: 404 });

  if (meta.contentType.startsWith("text/")) {
    return new Response(content, {
      headers: { ...corsHeaders, "Content-Type": meta.contentType + "; charset=utf-8" },
    });
  }

  const bin = atob(content);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(buf, {
    headers: {
      ...corsHeaders,
      "Content-Type": meta.contentType,
      "Content-Disposition": 'attachment; filename="' + meta.filename + '"',
    },
  });
}

// 处理订阅链接 /sub/{id} - 代理请求原始订阅链接并返回内容
async function handleSub(id: string, env: Env) {
  const meta = await getMeta(env, id);
  if (!meta) return new Response("Not found", { status: 404 });
  const content = await getContent(env, id);
  if (!content) return new Response("No content", { status: 404 });

  // 如果是订阅类型，content 是原始订阅链接，需要代理请求
  if (meta.type === "subscription" && content.startsWith("http")) {
    try {
      const response = await fetch(content, {
        headers: {
          "User-Agent": "ClashForAndroid/2.5.12",
        },
      });
      
      if (!response.ok) {
        return new Response("Failed to fetch subscription", { status: 502 });
      }
      
      const subContent = await response.text();
      return new Response(subContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    } catch (e) {
      return new Response("Failed to fetch subscription: " + (e as Error).message, { status: 502 });
    }
  }

  // 非订阅类型，直接返回内容
  return new Response(content, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

async function handleMetadata(id: string, env: Env) {
  const meta = await getMeta(env, id);
  if (!meta) return json({ error: "Not found" }, 404);
  return json(meta);
}

function handleSiteConfig(env: Env) {
  return json({
    siteName: env.SITE_NAME || "CloudShare",
    telegramBot: env.TELEGRAM_BOT || "",
    footerText: env.FOOTER_TEXT || "基于 Cloudflare 构建的私有文件分享服务",
  });
}

function verifyAdminAuth(req: Request, env: Env): boolean {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === env.ADMIN_PASSWORD;
}

async function handleAdminLogin(req: Request, env: Env) {
  try {
    const body = await req.json() as { password?: string };
    if (body.password === env.ADMIN_PASSWORD) return json({ success: true });
    return json({ error: "Invalid password" }, 401);
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
}

async function handleAdminRecords(req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  const list = await env.METADATA.list({ prefix: "meta:" });
  const out = [];
  for (const k of list.keys.slice(0, 100)) {
    const m = await env.METADATA.get(k.name, { cacheTtl: 300 });
    if (m) out.push(JSON.parse(m));
  }
  return json({ records: out });
}

async function handleAdminDelete(id: string, req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  await env.METADATA.delete("meta:" + id);
  await env.METADATA.delete("content:" + id);
  return json({ success: true });
}

async function handleAdminDownload(id: string, req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  const meta = await getMeta(env, id);
  if (!meta) return new Response("Not found", { status: 404 });
  const content = await getContent(env, id);
  if (!content) return new Response("No content", { status: 404 });

  if (meta.contentType.startsWith("text/")) {
    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": meta.contentType + "; charset=utf-8",
        "Content-Disposition": 'attachment; filename="' + meta.filename + '"',
      },
    });
  }

  const bin = atob(content);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(buf, {
    headers: {
      ...corsHeaders,
      "Content-Type": meta.contentType,
      "Content-Disposition": 'attachment; filename="' + meta.filename + '"',
    },
  });
}


export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // API 路由 - 只处理 /api/ 和 /raw/ 开头的请求
    if (url.pathname === "/api/config") {
      return handleSiteConfig(env);
    }

    if (url.pathname === "/api/upload" && req.method === "POST") {
      return handleUpload(req, env);
    }

    if (url.pathname.startsWith("/raw/")) {
      return handleRaw(url.pathname.slice(5), env);
    }

    // 订阅链接 - 直接返回纯文本内容
    if (url.pathname.startsWith("/sub/")) {
      return handleSub(url.pathname.slice(5), env);
    }

    if (url.pathname.startsWith("/api/file/")) {
      return handleMetadata(url.pathname.split("/")[3], env);
    }

    // 管理员 API
    const adminPath = env.ADMIN_PATH || "admin";

    if (url.pathname === "/api/" + adminPath + "/login" && req.method === "POST") {
      return handleAdminLogin(req, env);
    }

    if (url.pathname === "/api/" + adminPath + "/records" && req.method === "GET") {
      return handleAdminRecords(req, env);
    }

    if (url.pathname.startsWith("/api/" + adminPath + "/delete/") && req.method === "DELETE") {
      const id = url.pathname.split("/").pop();
      if (id) return handleAdminDelete(id, req, env);
    }

    if (url.pathname.startsWith("/api/" + adminPath + "/download/") && req.method === "GET") {
      const id = url.pathname.split("/").pop();
      if (id) return handleAdminDownload(id, req, env);
    }

    // 非 API 请求交给 Assets 处理（前端 SPA）
    return env.ASSETS.fetch(req);
  },
};
