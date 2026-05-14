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
        reject(new Error("JSON invalido."));
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

// In-memory rate limit. Resets on cold start, but combined with Vercel's
// function reuse gives a reasonable first defense against abuse.
// For real production, swap for Upstash Redis (env: UPSTASH_REDIS_REST_URL).
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_BUCKETS = new Map();
const RATE_PRUNE_THRESHOLD = 5000;

function checkRateLimit(req, { max, key, scope = "default" } = {}) {
  const envKey = scope === "feedback" ? "FEEDBACK_RATE_LIMIT_PER_HOUR" : "RATE_LIMIT_PER_HOUR";
  const envDefault = scope === "feedback" ? 10 : 30;
  const limit = Number(max || process.env[envKey]) || envDefault;
  const id = `${scope}:${key || getClientIp(req)}`;
  const now = Date.now();

  let bucket = RATE_BUCKETS.get(id);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + RATE_WINDOW_MS };
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
