// Cloudflare Pages Functions - 处理所有 API 请求

interface Env {
  METADATA: KVNamespace;
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

async function getMeta(env: Env, id: string) {
  const str = await env.METADATA.get("meta:" + id, { cacheTtl: META_CACHE_TTL });
  return str ? JSON.parse(str) : null;
}

async function getContent(env: Env, id: string) {
  return env.METADATA.get("content:" + id, { cacheTtl: META_CACHE_TTL });
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // /api/config
  if (url.pathname === "/api/config") {
    return json({
      siteName: env.SITE_NAME || "CloudShare",
      telegramBot: env.TELEGRAM_BOT || "",
      footerText: env.FOOTER_TEXT || "基于 Cloudflare 构建的私有文件分享服务",
    });
  }

  // /api/upload
  if (url.pathname === "/api/upload" && request.method === "POST") {
    const ct = request.headers.get("Content-Type") || "";
    let content = "";
    let filename = "file";
    let mime = "application/octet-stream";

    if (ct.includes("multipart/form-data")) {
      const fd = await request.formData();
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
      const body = await request.json() as { content?: string; filename?: string; contentType?: string };
      content = body.content || "";
      filename = body.filename || "text.txt";
      mime = body.contentType || "text/plain";
    }

    const id = generateId();
    const meta = { id, filename, contentType: mime, size: content.length, createdAt: new Date().toISOString() };
    await env.METADATA.put("content:" + id, content);
    await env.METADATA.put("meta:" + id, JSON.stringify(meta));
    return json({ id, url: "/raw/" + id });
  }

  // /raw/{id} - 返回原始文件内容
  if (url.pathname.startsWith("/raw/")) {
    const id = url.pathname.slice(5);
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

  // /sub/{id} - 订阅链接，直接返回纯文本
  if (url.pathname.startsWith("/sub/")) {
    const id = url.pathname.slice(5);
    const meta = await getMeta(env, id);
    if (!meta) return new Response("Not found", { status: 404 });
    const content = await getContent(env, id);
    if (!content) return new Response("No content", { status: 404 });

    return new Response(content, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  // /api/file/{id}
  if (url.pathname.startsWith("/api/file/")) {
    const id = url.pathname.split("/")[3];
    const meta = await getMeta(env, id);
    if (!meta) return json({ error: "Not found" }, 404);
    return json(meta);
  }

  // 管理员 API
  const adminPath = env.ADMIN_PATH || "admin";

  // 验证管理员权限
  const verifyAdmin = () => {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
    return authHeader.slice(7) === env.ADMIN_PASSWORD;
  };

  if (url.pathname === "/api/" + adminPath + "/login" && request.method === "POST") {
    try {
      const body = await request.json() as { password?: string };
      if (body.password === env.ADMIN_PASSWORD) return json({ success: true });
      return json({ error: "Invalid password" }, 401);
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
  }

  if (url.pathname === "/api/" + adminPath + "/records" && request.method === "GET") {
    if (!verifyAdmin()) return json({ error: "Unauthorized" }, 401);
    const list = await env.METADATA.list({ prefix: "meta:" });
    const out = [];
    for (const k of list.keys.slice(0, 100)) {
      const m = await env.METADATA.get(k.name, { cacheTtl: 300 });
      if (m) out.push(JSON.parse(m));
    }
    return json({ records: out });
  }

  if (url.pathname.startsWith("/api/" + adminPath + "/delete/") && request.method === "DELETE") {
    if (!verifyAdmin()) return json({ error: "Unauthorized" }, 401);
    const id = url.pathname.split("/").pop();
    if (id) {
      await env.METADATA.delete("meta:" + id);
      await env.METADATA.delete("content:" + id);
    }
    return json({ success: true });
  }

  if (url.pathname.startsWith("/api/" + adminPath + "/download/") && request.method === "GET") {
    if (!verifyAdmin()) return json({ error: "Unauthorized" }, 401);
    const id = url.pathname.split("/").pop();
    if (!id) return new Response("Not found", { status: 404 });
    
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

  // 其他请求返回 next()，让 Pages 处理静态文件
  return context.next();
};
