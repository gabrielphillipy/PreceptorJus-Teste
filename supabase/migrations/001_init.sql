-- PreceptorJus — schema inicial
-- Execute no SQL Editor do Supabase ou via `supabase db push`.

-- ── Studies ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS studies (
  id          TEXT        NOT NULL,
  device_id   TEXT        NOT NULL,
  topic       TEXT        NOT NULL,
  text        TEXT        NOT NULL DEFAULT '',
  mode        TEXT        NOT NULL DEFAULT '',
  mode_label  TEXT        NOT NULL DEFAULT '',
  favorite    BOOLEAN     NOT NULL DEFAULT false,
  excerpt     TEXT        NOT NULL DEFAULT '',
  date        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (id),
  -- Espelha a deduplicação local: um único estudo por tópico por dispositivo.
  UNIQUE (device_id, topic)
);

CREATE INDEX IF NOT EXISTS studies_device_id_idx
  ON studies (device_id, created_at DESC);

-- Atualiza updated_at automaticamente em cada UPDATE
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS studies_updated_at ON studies;
CREATE TRIGGER studies_updated_at
  BEFORE UPDATE ON studies
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ── Exams ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id          TEXT        NOT NULL PRIMARY KEY,
  device_id   TEXT        NOT NULL,
  topic       TEXT        NOT NULL,
  difficulty  TEXT        NOT NULL DEFAULT '',
  correct     INTEGER     NOT NULL DEFAULT 0,
  total       INTEGER     NOT NULL DEFAULT 0,
  date        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exams_device_id_idx
  ON exams (device_id, created_at DESC);

-- ── Feedbacks ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedbacks (
  id          TEXT        NOT NULL PRIMARY KEY,
  device_id   TEXT,
  type        TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  contact     TEXT        NOT NULL DEFAULT '',
  page        TEXT        NOT NULL DEFAULT '',
  date        TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS feedbacks_device_id_idx
  ON feedbacks (device_id, created_at DESC);

-- ── RLS (Row Level Security) ──────────────────────────────────────────────────
-- A service role bypassa o RLS automaticamente, então as políticas abaixo
-- protegem contra acessos diretos com a anon key (caso ela seja exposta).
ALTER TABLE studies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams     ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- Nega tudo para a anon role (o app usa o endpoint /api/workspace como proxy).
-- Se no futuro adicionar auth real, criar políticas adequadas aqui.
CREATE POLICY "deny_anon_studies"   ON studies   FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_exams"     ON exams     FOR ALL TO anon USING (false);
CREATE POLICY "deny_anon_feedbacks" ON feedbacks FOR ALL TO anon USING (false);
