-- Corre ya conectado a la base `missgarabatos` (no a `cuthis`).
-- Refleja lo que hoy vive en localStorage del front.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS teachers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  display_name  text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE teachers IS 'Dueña de las configs. El login vendrá después; por ahora se crea al primer guardado.';

-- Claves alineadas con el navegador:
--   catalogoFase2        → missgarabatos.catalogoFase2.v1
--   nivelesDesempeno     → missgarabatos.nivelesDesempeno.v1
--   evidencias_borrador  → mg_evidencias_borrador_v1
CREATE TABLE IF NOT EXISTS teacher_configs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES teachers (id) ON DELETE CASCADE,
  config_key  text NOT NULL,
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT teacher_configs_key_chk CHECK (
    config_key IN ('catalogoFase2', 'nivelesDesempeno', 'evidencias_borrador')
  ),
  CONSTRAINT teacher_configs_unique UNIQUE (teacher_id, config_key)
);

CREATE INDEX IF NOT EXISTS teacher_configs_teacher_idx ON teacher_configs (teacher_id);

COMMENT ON TABLE teacher_configs IS 'JSON de catálogo, niveles y borrador de evidencias (equivalente a localStorage).';
