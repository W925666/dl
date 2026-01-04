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

// 使用较短的缓存时间以确保数据更新
const META_CACHE_TTL = 60;

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
  let subscriptionInfo = null;
  let burnAfterRead = false;
  let expiresIn = null;
  let maxDownloads = null;
  let customSlug = null;

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("file") as File;
    if (!file) return json({ error: "No file" }, 400);
    if (file.size > 25 * 1024 * 1024) return json({ error: "Too large" }, 400);
    if (!isAllowedFile(file.name, file.type)) return json({ error: "File type blocked" }, 400);
    filename = file.name;
    mime = file.type || mime;
    type = (fd.get("type") as string) || "file";
    burnAfterRead = fd.get("burnAfterRead") === "true";
    expiresIn = fd.get("expiresIn") ? parseInt(fd.get("expiresIn") as string) : null;
    maxDownloads = fd.get("maxDownloads") ? parseInt(fd.get("maxDownloads") as string) : null;
    customSlug = fd.get("customSlug") as string || null;
    const subInfoStr = fd.get("subscriptionInfo") as string;
    if (subInfoStr) {
      try { subscriptionInfo = JSON.parse(subInfoStr); } catch {}
    }
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
    type = body.type || "text";
    subscriptionInfo = body.subscriptionInfo || null;
    burnAfterRead = body.burnAfterRead || false;
    expiresIn = body.expiresIn || null;
    maxDownloads = body.maxDownloads || null;
    customSlug = body.customSlug || null;
  }

  const id = customSlug || generateId();
  
  // 检查自定义 slug 是否已存在
  if (customSlug) {
    const existing = await getMeta(env, customSlug);
    if (existing) return json({ error: "Custom slug already exists" }, 400);
  }
  
  // 计算过期时间 (expiresIn 单位是小时)
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 3600 * 1000).toISOString() : null;
  
  const meta = { 
    id, 
    filename, 
    contentType: mime, 
    size: content.length, 
    type, 
    subscriptionInfo,
    originalUrl: type === 'subscription' ? content : undefined,
    burnAfterRead,
    expiresAt,
    maxDownloads,
    downloadCount: 0,
    createdAt: new Date().toISOString() 
  };
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

// 转换流量单位到字节的辅助函数
const parseSize = (s: string): number => {
  if (!s) return 0;
  const match = s.match(/^([\d.]+)\s*(GB|MB|TB|KB|B)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  const unit = (match[2] || 'B').toUpperCase();
  const units: Record<string, number> = { B: 1, KB: 1024, MB: 1024*1024, GB: 1024*1024*1024, TB: 1024*1024*1024*1024 };
  return Math.floor(num * (units[unit] || 1));
};

// 构建订阅信息响应头
function buildSubscriptionHeaders(subInfo: { upload?: string; download?: string; total?: string; expire?: string; name?: string } | null): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (!subInfo) return headers;
  
  const hasCustomInfo = Object.keys(subInfo).length > 0 && 
    (
      (subInfo.upload && subInfo.upload.trim() !== '') || 
      (subInfo.download && subInfo.download.trim() !== '') || 
      (subInfo.total && subInfo.total.trim() !== '') || 
      (subInfo.expire && subInfo.expire.trim() !== '')
    );
  
  if (hasCustomInfo) {
    const infoParts: string[] = [];
    
    if (subInfo.upload && subInfo.upload.trim() !== '') {
      infoParts.push(`upload=${parseSize(subInfo.upload)}`);
    }
    
    if (subInfo.download && subInfo.download.trim() !== '') {
      infoParts.push(`download=${parseSize(subInfo.download)}`);
    }
    
    if (subInfo.total && subInfo.total.trim() !== '') {
      infoParts.push(`total=${parseSize(subInfo.total)}`);
    }
    
    if (subInfo.expire && subInfo.expire.trim() !== '') {
      const expireStr = subInfo.expire.trim();
      // 尝试解析日期，支持多种格式
      let expireDate: Date;
      
      // 如果只有日期部分 (YYYY-MM-DD 或 YYYY-M-D)，添加时间为当天结束
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(expireStr)) {
        expireDate = new Date(expireStr + 'T23:59:59+08:00');
      } else {
        expireDate = new Date(expireStr);
      }
      
      if (!isNaN(expireDate.getTime())) {
        infoParts.push(`expire=${Math.floor(expireDate.getTime() / 1000)}`);
      }
    }
    
    if (infoParts.length > 0) {
      headers["subscription-userinfo"] = infoParts.join("; ");
    }
  }
  
  // 处理订阅名称
  if (subInfo.name && subInfo.name.trim() !== '') {
    const encodedName = encodeURIComponent(subInfo.name.trim());
    headers["content-disposition"] = `attachment; filename*=UTF-8''${encodedName}`;
  }
  
  return headers;
}

// 安全的文件名编码
function encodeFilename(filename: string): string {
  // RFC 5987 编码
  const encoded = encodeURIComponent(filename).replace(/['()]/g, escape).replace(/\*/g, '%2A');
  return `attachment; filename*=UTF-8''${encoded}`;
}

async function handleRaw(id: string, env: Env) {
  const meta = await getMeta(env, id);
  if (!meta) return new Response("Not found", { status: 404 });
  
  // 检查是否过期
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    await env.METADATA.delete("meta:" + id);
    await env.METADATA.delete("content:" + id);
    return new Response("File expired", { status: 410 });
  }
  
  // 检查下载次数限制
  if (meta.maxDownloads && meta.downloadCount >= meta.maxDownloads) {
    return new Response("Download limit reached", { status: 410 });
  }
  
  const content = await getContent(env, id);
  if (!content) return new Response("No content", { status: 404 });

  // 更新下载次数
  meta.downloadCount = (meta.downloadCount || 0) + 1;
  
  // 阅后即焚：访问后删除
  if (meta.burnAfterRead) {
    await env.METADATA.delete("meta:" + id);
    await env.METADATA.delete("content:" + id);
  } else {
    await env.METADATA.put("meta:" + id, JSON.stringify(meta));
  }

  // 构建订阅信息响应头
  const subHeaders = buildSubscriptionHeaders(meta.subscriptionInfo);

  if (meta.contentType.startsWith("text/")) {
    return new Response(content, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": meta.contentType + "; charset=utf-8",
        ...subHeaders,
        // 如果没有自定义名称，保留原文件名
        ...(!subHeaders["content-disposition"] && { "Content-Disposition": encodeFilename(meta.filename) }),
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
      ...subHeaders,
      // 如果没有自定义名称，保留原文件名
      ...(!subHeaders["content-disposition"] && { "Content-Disposition": encodeFilename(meta.filename) }),
    },
  });
}

// 处理订阅链接 /sub/{id} - 代理请求原始订阅链接并返回内容
async function handleSub(id: string, env: Env) {
  const meta = await getMeta(env, id);
  if (!meta) return new Response("Not found", { status: 404 });
  
  // 检查是否过期
  if (meta.expiresAt && new Date(meta.expiresAt) < new Date()) {
    await env.METADATA.delete("meta:" + id);
    await env.METADATA.delete("content:" + id);
    return new Response("Subscription expired", { status: 410 });
  }
  
  // 检查下载次数限制
  if (meta.maxDownloads && meta.downloadCount >= meta.maxDownloads) {
    return new Response("Download limit reached", { status: 410 });
  }
  
  const content = await getContent(env, id);
  if (!content) return new Response("No content", { status: 404 });

  // 更新下载次数
  meta.downloadCount = (meta.downloadCount || 0) + 1;
  
  // 阅后即焚：访问后删除
  if (meta.burnAfterRead) {
    await env.METADATA.delete("meta:" + id);
    await env.METADATA.delete("content:" + id);
  } else {
    await env.METADATA.put("meta:" + id, JSON.stringify(meta));
  }

  // 如果是订阅类型，content 是原始订阅链接，需要代理请求
  if (meta.type === "subscription" && content.startsWith("http")) {
    try {
      const response = await fetch(content, {
        headers: {
          "User-Agent": "ClashForAndroid/2.5.12",
          "Accept": "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
        },
        cf: {
          cacheTtl: 0,
          cacheEverything: false,
        },
      });
      
      if (!response.ok) {
        return new Response(`Failed to fetch subscription: ${response.status} ${response.statusText}`, { status: 502 });
      }
      
      const subContent = await response.text();
      const originalUserInfo = response.headers.get("subscription-userinfo");
      
      // 构建响应头
      const responseHeaders: Record<string, string> = {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
      };
      
      // 解析原始订阅信息
      const parseUserInfo = (header: string | null): Record<string, string> => {
        if (!header) return {};
        const result: Record<string, string> = {};
        header.split(";").forEach(part => {
          const [key, value] = part.trim().split("=");
          if (key && value) result[key.trim()] = value.trim();
        });
        return result;
      };
      
      const originalInfo = parseUserInfo(originalUserInfo);
      const subInfo = meta.subscriptionInfo;
      
      // 使用辅助函数构建订阅信息头
      const subHeaders = buildSubscriptionHeaders(subInfo);
      
      if (subHeaders["subscription-userinfo"]) {
        // 有自定义信息，但需要合并原始信息中未覆盖的字段
        const customParts = subHeaders["subscription-userinfo"].split("; ");
        const customKeys = customParts.map(p => p.split("=")[0]);
        
        // 添加原始信息中未被覆盖的字段
        for (const [key, value] of Object.entries(originalInfo)) {
          if (!customKeys.includes(key)) {
            customParts.push(`${key}=${value}`);
          }
        }
        responseHeaders["subscription-userinfo"] = customParts.join("; ");
      } else if (originalUserInfo) {
        responseHeaders["subscription-userinfo"] = originalUserInfo;
      }
      
      // 复制其他响应头
      const profileUpdateInterval = response.headers.get("profile-update-interval");
      if (profileUpdateInterval) {
        responseHeaders["profile-update-interval"] = profileUpdateInterval;
      }
      
      // 处理订阅名称
      if (subHeaders["content-disposition"]) {
        responseHeaders["content-disposition"] = subHeaders["content-disposition"];
      } else {
        const contentDisposition = response.headers.get("content-disposition");
        if (contentDisposition) {
          responseHeaders["content-disposition"] = contentDisposition;
        }
      }
      
      return new Response(subContent, { headers: responseHeaders });
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
    if (m) {
      const meta = JSON.parse(m);
      // 检查是否有内容
      const contentKey = "content:" + meta.id;
      const hasContent = await env.METADATA.get(contentKey, { type: "text" }) !== null;
      out.push({ ...meta, hasContent });
    }
  }
  // 按创建时间倒序排列（最新的在前面）
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return json({ records: out });
}

async function handleAdminDelete(id: string, req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  await env.METADATA.delete("meta:" + id);
  await env.METADATA.delete("content:" + id);
  return json({ success: true });
}

async function handleAdminBatchDelete(req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  try {
    const body = await req.json() as { ids?: string[] };
    if (!body.ids || !Array.isArray(body.ids)) {
      return json({ error: "Invalid request: ids array required" }, 400);
    }
    
    let successCount = 0;
    let failCount = 0;
    
    for (const id of body.ids) {
      try {
        await env.METADATA.delete("meta:" + id);
        await env.METADATA.delete("content:" + id);
        successCount++;
      } catch {
        failCount++;
      }
    }
    
    return json({ success: true, deleted: successCount, failed: failCount });
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
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
        "Content-Disposition": encodeFilename(meta.filename),
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
      "Content-Disposition": encodeFilename(meta.filename),
    },
  });
}

// 获取统计信息
async function handleAdminStats(req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  
  const list = await env.METADATA.list({ prefix: "meta:" });
  let totalFiles = 0;
  let totalTexts = 0;
  let totalSubscriptions = 0;
  let totalSize = 0;
  let expiredCount = 0;
  const now = new Date();
  
  for (const k of list.keys) {
    const m = await env.METADATA.get(k.name, { cacheTtl: 300 });
    if (m) {
      const meta = JSON.parse(m);
      if (meta.type === 'file') totalFiles++;
      else if (meta.type === 'text') totalTexts++;
      else if (meta.type === 'subscription') totalSubscriptions++;
      
      if (meta.size) totalSize += meta.size;
      if (meta.expiresAt && new Date(meta.expiresAt) < now) expiredCount++;
    }
  }
  
  return json({
    total: list.keys.length,
    files: totalFiles,
    texts: totalTexts,
    subscriptions: totalSubscriptions,
    totalSize,
    expired: expiredCount,
  });
}

// 清理过期文件
async function cleanupExpiredFiles(env: Env): Promise<{ deleted: number; errors: number }> {
  const list = await env.METADATA.list({ prefix: "meta:" });
  const now = new Date();
  let deleted = 0;
  let errors = 0;
  
  for (const k of list.keys) {
    try {
      const m = await env.METADATA.get(k.name);
      if (m) {
        const meta = JSON.parse(m);
        if (meta.expiresAt && new Date(meta.expiresAt) < now) {
          await env.METADATA.delete("meta:" + meta.id);
          await env.METADATA.delete("content:" + meta.id);
          deleted++;
        }
      }
    } catch {
      errors++;
    }
  }
  
  return { deleted, errors };
}

// 手动触发清理
async function handleAdminCleanup(req: Request, env: Env) {
  if (!verifyAdminAuth(req, env)) return json({ error: "Unauthorized" }, 401);
  const result = await cleanupExpiredFiles(env);
  return json({ success: true, ...result });
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

    if (url.pathname === "/api/" + adminPath + "/batch-delete" && req.method === "POST") {
      return handleAdminBatchDelete(req, env);
    }

    if (url.pathname.startsWith("/api/" + adminPath + "/download/") && req.method === "GET") {
      const id = url.pathname.split("/").pop();
      if (id) return handleAdminDownload(id, req, env);
    }

    if (url.pathname === "/api/" + adminPath + "/stats" && req.method === "GET") {
      return handleAdminStats(req, env);
    }

    if (url.pathname === "/api/" + adminPath + "/cleanup" && req.method === "POST") {
      return handleAdminCleanup(req, env);
    }

    // 非 API 请求交给 Assets 处理（前端 SPA）
    return env.ASSETS.fetch(req);
  },

};
