// Shared HTTP helpers, IP-based rate limiting, and domain selection.
// Vercel ignores files under folders prefixed with "_" for routing.

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function send(res, status, payload) {
  res.statusCode = status;
  Object.entries(JSON_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function readBody(req, limitBytes = 1_000_000) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limitBytes) {
        reject(new Error("Payload muito grande."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("JSON inválido."));
      }
    });
    req.on("error", reject);
  });
}

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  const real = req.headers["x-real-ip"];
  if (real) return String(real).trim();
  return req.socket?.remoteAddress || "unknown";
}

// Rate limit. Quando UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// estão configurados, usa Redis (persistente e compartilhado entre todas
// as instâncias). Caso contrário, cai para um Map em memória — frágil em
// serverless (cada cold start zera, cada instância tem seu próprio mapa),
// mas funciona em dev/teste.
const RATE_WINDOW_SEC = 60 * 60;
const RATE_BUCKETS = new Map(); // fallback in-memory
const RATE_PRUNE_THRESHOLD = 5000;

function rateLimitParams({ max, key, scope = "default" }, req) {
  const envKey = scope === "feedback" ? "FEEDBACK_RATE_LIMIT_PER_HOUR" : "RATE_LIMIT_PER_HOUR";
  const envDefault = scope === "feedback" ? 10 : 30;
  const limit = Number(max || process.env[envKey]) || envDefault;
  const id = `ratelimit:${scope}:${key || getClientIp(req)}`;
  return { limit, id };
}

// ── Upstash Redis (REST API, sem dependência de npm) ────────────────
function upstashConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

async function upstashPipeline(commands) {
  const url = `${process.env.UPSTASH_REDIS_REST_URL.replace(/\/+$/, "")}/pipeline`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });
    if (!res.ok) throw new Error(`upstash ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkRateLimitRedis(id, limit) {
  // INCR key → count
  // EXPIRE key TTL NX → garante TTL apenas se ainda não tem (1ª chamada da janela)
  // TTL key → segundos restantes
  const results = await upstashPipeline([
    ["INCR", id],
    ["EXPIRE", id, String(RATE_WINDOW_SEC), "NX"],
    ["TTL", id],
  ]);
  const count = Number(results?.[0]?.result ?? 0);
  let ttl = Number(results?.[2]?.result ?? RATE_WINDOW_SEC);
  if (!Number.isFinite(ttl) || ttl < 0) ttl = RATE_WINDOW_SEC;

  return {
    blocked: count > limit,
    remaining: Math.max(0, limit - count),
    retryAfterSec: ttl,
    limit,
  };
}

// ── Fallback in-memory ──────────────────────────────────────────────
function checkRateLimitMemory(id, limit) {
  const now = Date.now();
  let bucket = RATE_BUCKETS.get(id);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_SEC * 1000 };
  }
  bucket.count++;
  RATE_BUCKETS.set(id, bucket);

  if (RATE_BUCKETS.size > RATE_PRUNE_THRESHOLD) {
    for (const [k, v] of RATE_BUCKETS) {
      if (now > v.resetAt) RATE_BUCKETS.delete(k);
    }
  }

  return {
    blocked: bucket.count > limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    limit,
  };
}

async function checkRateLimit(req, opts = {}) {
  const { limit, id } = rateLimitParams(opts, req);

  if (upstashConfigured()) {
    try {
      return await checkRateLimitRedis(id, limit);
    } catch (err) {
      // Falha do Redis (timeout, indisponível) → fail open com fallback
      // in-memory, para não bloquear o serviço por uma indisponibilidade
      // do Upstash. Loga para visibilidade.
      console.error("rate-limit: Upstash falhou, usando in-memory fallback:", err?.message || err);
    }
  }
  return checkRateLimitMemory(id, limit);
}

// Returns the active domain object. To add PreceptorMed:
//   1. Create api/_lib/medical.js exporting MEDICAL_DOMAIN with the same shape as LEGAL_DOMAIN
//   2. Set PRODUCT_DOMAIN=medical in the Vercel env
function getActiveDomain() {
  const requested = String(process.env.PRODUCT_DOMAIN || "legal").toLowerCase().trim();

  let domain;
  if (requested === "medical") {
    try {
      domain = require("./medical").MEDICAL_DOMAIN;
    } catch {
      domain = require("./legal").LEGAL_DOMAIN;
    }
  } else {
    domain = require("./legal").LEGAL_DOMAIN;
  }

  // Cosmetic overrides (don't change validation or templates)
  const personaOverride = process.env.PRODUCT_NAME && process.env.PRODUCT_NAME.trim();
  if (personaOverride) {
    return { ...domain, persona: personaOverride };
  }
  return domain;
}

module.exports = {
  JSON_HEADERS,
  send,
  readBody,
  getClientIp,
  checkRateLimit,
  getActiveDomain,
};
