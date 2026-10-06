// J.A.R.V.I.S. server: serves the HUD and streams Claude's replies to it.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Brain } from "./src/brain.mjs";
import { Memory } from "./src/memory.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(here, ".env"));
} catch {
  // No .env file - rely on the real environment.
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const config = {
  port: Number(process.env.PORT) || 3000,
  model: process.env.JARVIS_MODEL || "claude-opus-5-5",
  effort: EFFORTS.includes(process.env.JARVIS_EFFORT) ? process.env.JARVIS_EFFORT : "low",
  accessCode: process.env.JARVIS_ACCESS_CODE || "",
  dataDir: path.resolve(here, process.env.JARVIS_DATA_DIR || "data"),
};
const PUBLIC_DIR = path.join(here, "public");
const MAX_BODY = 64 * 1024;

const memory = new Memory(config.dataDir);
await memory.load();
const brain = new Brain({ config, memory });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; "),
};

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store", ...SECURITY_HEADERS });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

function authorised(req) {
  if (!config.accessCode) return true;
  const given = String(req.headers["x-jarvis-code"] ?? "");
  const a = crypto.createHash("sha256").update(given).digest();
  const b = crypto.createHash("sha256").update(config.accessCode).digest();
  return crypto.timingSafeEqual(a, b);
}

const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");

function cleanHonorific(v) {
  const h = str(v, 40).replace(/[\r\n<>"]/g, " ").trim();
  return h || "sir";
}

function cleanTelemetry(t) {
  if (!t || typeof t !== "object") return null;
  const json = JSON.stringify(t);
  return json.length > 2000 ? null : JSON.parse(json);
}

async function handleChat(req, res) {
  const body = await readJson(req);
  const sessionId = str(body.sessionId, 64);
  const text = str(body.message, 4000).trim();
  if (!/^[\w-]{8,64}$/.test(sessionId) || !text) {
    return sendJson(res, 400, { error: "sessionId and message are required" });
  }
  const session = brain.session(sessionId, cleanHonorific(body.honorific));
  const telemetry = cleanTelemetry(body.telemetry);
  if (telemetry) session.telemetry = telemetry;
  const context = {
    localTime: str(body.context?.localTime, 80),
    timezone: str(body.context?.timezone, 60),
    locale: str(body.context?.locale, 20),
  };

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...SECURITY_HEADERS,
  });
  res.flushHeaders();

  const hangup = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) hangup.abort();
  });
  const emit = (event, data) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  // Keeps proxies from closing the stream while Claude is thinking or searching.
  const heartbeat = setInterval(() => !res.writableEnded && res.write(": keep-alive\n\n"), 15000);

  try {
    await brain.command({ session, text, context, emit, signal: hangup.signal });
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
}

async function serveStatic(req, res, pathname) {
  let rel;
  try {
    rel = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    return sendJson(res, 400, { error: "Bad path" });
  }
  const file = path.resolve(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: "Not found" });
  try {
    const data = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
      ...SECURITY_HEADERS,
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function route(req, res) {
  const { pathname } = new URL(req.url, "http://localhost");

  if (pathname === "/api/health" && req.method === "GET") {
    return sendJson(res, 200, {
      online: true,
      model: config.model,
      keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
      accessCodeRequired: Boolean(config.accessCode),
      authorised: authorised(req),
    });
  }

  if (pathname.startsWith("/api/")) {
    if (!authorised(req)) return sendJson(res, 401, { error: "Access code required" });

    if (pathname === "/api/chat" && req.method === "POST") return handleChat(req, res);

    if (pathname === "/api/reset" && req.method === "POST") {
      const { sessionId } = await readJson(req);
      brain.reset(str(sessionId, 64));
      return sendJson(res, 200, { ok: true });
    }

    if (pathname === "/api/memory" && req.method === "GET") {
      return sendJson(res, 200, { facts: memory.list() });
    }

    if (pathname === "/api/memory" && req.method === "DELETE") {
      await memory.clear();
      return sendJson(res, 200, { ok: true });
    }

    return sendJson(res, 404, { error: "Not found" });
  }

  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req, res, pathname);
  sendJson(res, 405, { error: "Method not allowed" });
}

const server = http.createServer((req, res) => {
  route(req, res).catch((err) => {
    if (!err.status) console.error("[server]", err);
    if (res.headersSent) return res.end();
    sendJson(res, err.status ?? 500, { error: err.status ? err.message : "Internal error" });
  });
});

server.listen(config.port, () => {
  console.log(`J.A.R.V.I.S. online at http://localhost:${config.port}  (model ${config.model}, effort ${config.effort})`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn("ANTHROPIC_API_KEY is not set - the HUD will load, but J.A.R.V.I.S. can't think until you add it to .env");
  }
  if (!config.accessCode) {
    console.warn("JARVIS_ACCESS_CODE is not set - anyone who can reach this server can use your API key. Set one before deploying.");
  }
});
