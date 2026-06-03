// Supabase REST client usando fetch nativo — sem dependência de npm.
// Usa a service role key (server-side only, nunca exposta ao frontend).

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function authHeaders() {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function restUrl(table, filters = {}) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  for (const [col, val] of Object.entries(filters)) {
    url.searchParams.set(col, `eq.${val}`);
  }
  return url;
}

/**
 * SELECT com filtros opcionais.
 * @param {string} table
 * @param {Record<string,string>} filters  — col: value (operador eq. aplicado)
 * @param {{ select?: string, order?: string, limit?: number }} opts
 */
async function select(table, filters = {}, opts = {}) {
  const url = restUrl(table, filters);
  url.searchParams.set("select", opts.select || "*");
  if (opts.order) url.searchParams.set("order", opts.order);
  if (opts.limit) url.searchParams.set("limit", String(opts.limit));

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (!res.ok) throw new Error(`supabase select ${table}: ${await res.text()}`);
  return res.json();
}

/**
 * UPSERT (INSERT … ON CONFLICT DO UPDATE) usando a coluna de conflito.
 * @param {string} table
 * @param {object|object[]} data
 * @param {string} [onConflict]  — coluna(s) de conflito, ex: "id" ou "device_id,topic"
 */
async function upsert(table, data, onConflict = "id") {
  const url = restUrl(table);
  if (onConflict) url.searchParams.set("on_conflict", onConflict);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...authHeaders(),
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`supabase upsert ${table}: ${await res.text()}`);
}

/**
 * INSERT simples (sem upsert).
 */
async function insert(table, data) {
  const res = await fetch(restUrl(table).toString(), {
    method: "POST",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`supabase insert ${table}: ${await res.text()}`);
}

/**
 * DELETE com filtros (AND implícito entre os filtros).
 */
async function del(table, filters) {
  const res = await fetch(restUrl(table, filters).toString(), {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`supabase delete ${table}: ${await res.text()}`);
}

/**
 * UPDATE com filtros.
 */
async function update(table, filters, data) {
  const res = await fetch(restUrl(table, filters).toString(), {
    method: "PATCH",
    headers: { ...authHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`supabase update ${table}: ${await res.text()}`);
}

module.exports = { isConfigured, select, upsert, insert, del, update };
