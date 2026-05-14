const { send, readBody, checkRateLimit } = require("./_lib/utils");

// Sends feedback to a generic webhook (Slack, Discord, or any HTTPS endpoint
// accepting application/json). Configure with env var FEEDBACK_WEBHOOK_URL.
// If unset, the endpoint accepts the payload silently so the UI keeps working.

async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST." });
  }

  const limit = checkRateLimit(req, { scope: "feedback" });
  if (limit.blocked) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    return send(res, 429, {
      error: "Muitos feedbacks em pouco tempo. Tente novamente em alguns minutos.",
    });
  }

  try {
    const body = await readBody(req, 50_000);
    const message = String(body.message || "").trim();
    if (!message) return send(res, 400, { error: "Mensagem vazia." });
    if (message.length > 5000) return send(res, 413, { error: "Mensagem muito longa (max 5000)." });

    const type = String(body.type || "Sugestao").trim().slice(0, 60);
    const contact = String(body.contact || "").trim().slice(0, 200);
    const page = String(body.page || "").trim().slice(0, 100);
    const product = (process.env.PRODUCT_NAME || "PreceptorJus").trim();
    const webhook = process.env.FEEDBACK_WEBHOOK_URL;

    if (!webhook) {
      return send(res, 200, {
        ok: true,
        persisted: "local-only",
        warn: "FEEDBACK_WEBHOOK_URL nao configurada — feedback ficou apenas no localStorage do navegador.",
      });
    }

    // Slack-compatible payload, with raw fields for generic webhooks (Discord, Zapier, etc.)
    const payload = {
      text: `*[${product}] ${type}*\n${message}\n\n*Contato:* ${contact || "—"}\n*Pagina:* ${page || "—"}`,
      product,
      type,
      message,
      contact,
      page,
      timestamp: new Date().toISOString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    let r;
    try {
      r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!r.ok) {
      return send(res, 502, { error: `Webhook recusou o envio (${r.status}).` });
    }

    return send(res, 200, { ok: true, persisted: "webhook" });
  } catch (error) {
    if (error && typeof error === "object" && error.name === "AbortError") {
      return send(res, 504, { error: "Webhook nao respondeu a tempo." });
    }
    return send(res, 500, {
      error: error instanceof Error ? error.message : "Erro inesperado ao enviar feedback.",
    });
  }
}

module.exports = handler;
module.exports.config = { maxDuration: 10 };
