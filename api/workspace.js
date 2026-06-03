// CRUD de workspace (estudos, simulados, feedbacks) via Supabase.
// A service role key só existe server-side; o frontend nunca a vê.

const { send, readBody } = require("./_lib/utils");
const db = require("./_lib/supabase");

// ── Transformers ────────────────────────────────────────────────────────────

function studyToDb(s, device_id) {
  return {
    id: s.id,
    device_id,
    topic: s.topic,
    text: s.text,
    mode: s.mode || "",
    mode_label: s.modeLabel || "",
    favorite: Boolean(s.favorite),
    excerpt: s.excerpt || "",
    date: s.date || "",
  };
}

function dbToStudy(row) {
  return {
    id: row.id,
    topic: row.topic,
    text: row.text,
    mode: row.mode || "",
    modeLabel: row.mode_label || "",
    favorite: Boolean(row.favorite),
    excerpt: row.excerpt || "",
    date: row.date || "",
  };
}

function examToDb(e, device_id) {
  return {
    id: e.id,
    device_id,
    topic: e.topic,
    difficulty: e.difficulty || "",
    correct: Number(e.correct) || 0,
    total: Number(e.total) || 0,
    date: e.date || "",
  };
}

function dbToExam(row) {
  return {
    id: row.id,
    topic: row.topic,
    difficulty: row.difficulty || "",
    correct: Number(row.correct) || 0,
    total: Number(row.total) || 0,
    date: row.date || "",
  };
}

function feedbackToDb(f, device_id) {
  return {
    id: f.id,
    device_id: device_id || null,
    type: f.type,
    message: f.message,
    contact: f.contact || "",
    page: f.page || "",
    date: f.date || "",
  };
}

// ── Validação básica de device_id ───────────────────────────────────────────

function validDeviceId(id) {
  return typeof id === "string" && id.length >= 10 && id.length <= 64;
}

// ── Handler ─────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (!db.isConfigured()) {
    return send(res, 503, { error: "Database não configurado." });
  }

  // ── GET /api/workspace?device_id=xxx ───────────────────────────────────
  if (req.method === "GET") {
    const device_id = req.query?.device_id;
    if (!validDeviceId(device_id)) {
      return send(res, 400, { error: "device_id inválido." });
    }

    try {
      const [studies, exams] = await Promise.all([
        db.select("studies", { device_id }, { order: "created_at.desc", limit: 30 }),
        db.select("exams", { device_id }, { order: "created_at.desc", limit: 30 }),
      ]);
      return send(res, 200, {
        studies: studies.map(dbToStudy),
        exams: exams.map(dbToExam),
      });
    } catch (err) {
      console.error("[workspace] GET error:", err.message);
      return send(res, 500, { error: "Erro ao buscar dados." });
    }
  }

  // ── POST /api/workspace ────────────────────────────────────────────────
  if (req.method === "POST") {
    let body;
    try {
      body = await readBody(req, 5_000_000); // estudos podem ser grandes
    } catch (err) {
      return send(res, 400, { error: err.message });
    }

    const { action, device_id, payload } = body || {};

    if (!validDeviceId(device_id)) {
      return send(res, 400, { error: "device_id inválido." });
    }
    if (!action || payload === undefined) {
      return send(res, 400, { error: "Campos obrigatórios ausentes." });
    }

    try {
      // ── upsert_study: substitui study com mesmo tópico (como o localStorage) ──
      if (action === "upsert_study") {
        await db.upsert("studies", studyToDb(payload, device_id), "device_id,topic");
        return send(res, 200, { ok: true });
      }

      // ── delete_study ────────────────────────────────────────────────────────
      if (action === "delete_study") {
        await db.del("studies", { id: payload.id, device_id });
        return send(res, 200, { ok: true });
      }

      // ── add_exam ─────────────────────────────────────────────────────────────
      if (action === "add_exam") {
        await db.upsert("exams", examToDb(payload, device_id), "id");
        return send(res, 200, { ok: true });
      }

      // ── add_feedback ──────────────────────────────────────────────────────────
      if (action === "add_feedback") {
        await db.upsert("feedbacks", feedbackToDb(payload, device_id), "id");
        return send(res, 200, { ok: true });
      }

      return send(res, 400, { error: "Ação desconhecida." });
    } catch (err) {
      console.error(`[workspace] POST ${action} error:`, err.message);
      return send(res, 500, { error: "Erro ao salvar dados." });
    }
  }

  return send(res, 405, { error: "Método não permitido." });
};
