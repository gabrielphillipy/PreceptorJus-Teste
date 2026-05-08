const plans = {
  preceptor: {
    name: "Preceptor",
    priceEnv: "STRIPE_PRICE_PRECEPTOR",
  },
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function getOrigin(req) {
  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"] || "https";
  const host = forwardedHost || req.headers.host;
  return `${forwardedProto}://${host}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return res.status(500).json({
      error: "Stripe nao configurado. Configure STRIPE_SECRET_KEY na Vercel.",
    });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return res.status(400).json({ error: "Corpo da requisicao invalido." });
  }

  const planId = String(body.plan || "").trim();
  const plan = plans[planId];
  if (!plan) {
    return res.status(400).json({ error: "Plano invalido." });
  }

  const priceId = process.env[plan.priceEnv];
  if (!priceId) {
    return res.status(500).json({
      error: `Preco do plano ${plan.name} nao configurado. Configure ${plan.priceEnv} na Vercel.`,
    });
  }

  const origin = getOrigin(req);
  const params = new URLSearchParams({
    mode: "subscription",
    success_url: `${origin}/?checkout=success&plan=${encodeURIComponent(planId)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=cancelled&plan=${encodeURIComponent(planId)}`,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[plan]": planId,
    allow_promotion_codes: "true",
  });

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const data = await stripeResponse.json().catch(() => ({}));
  if (!stripeResponse.ok) {
    return res.status(500).json({
      error: data.error?.message || "Nao foi possivel iniciar o checkout.",
    });
  }

  return res.status(200).json({ url: data.url });
};
