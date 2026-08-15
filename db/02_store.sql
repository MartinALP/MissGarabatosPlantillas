-- Tienda MissGarabatos-Store. Corre sobre la base `missgarabatos` (no cuthis).
-- Idempotente. También lo aplica MissGarabatosDatabaseBootstrap al arrancar la API.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS store_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  display_name  text,
  google_id     text UNIQUE,
  twitter_id    text UNIQUE,
  is_admin      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_settings (
  id          text PRIMARY KEY DEFAULT 'default',
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO store_settings (id, payload)
VALUES ('default', '{
  "heroTitle":"¿Qué vamos a llevar al salón hoy?",
  "heroTagline":"Plantillas, documentos y membresías Miss Garabatos.",
  "socials":[]
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS store_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  details_html  text NOT NULL DEFAULT '',
  price_cents   integer NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'MXN',
  is_free       boolean NOT NULL DEFAULT false,
  is_active     boolean NOT NULL DEFAULT true,
  is_featured   boolean NOT NULL DEFAULT false,
  tags          text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_product_assets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    uuid NOT NULL REFERENCES store_products (id) ON DELETE CASCADE,
  kind          text NOT NULL,
  storage_key   text NOT NULL,
  content_type  text,
  sort_order    integer NOT NULL DEFAULT 0,
  is_public     boolean NOT NULL DEFAULT false,
  CONSTRAINT store_product_assets_kind_chk CHECK (kind IN ('file', 'preview', 'gallery'))
);

CREATE INDEX IF NOT EXISTS store_product_assets_product_idx ON store_product_assets (product_id);

CREATE TABLE IF NOT EXISTS store_membership_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  description     text NOT NULL DEFAULT '',
  details_html    text NOT NULL DEFAULT '',
  price_cents     integer NOT NULL DEFAULT 0,
  currency        text NOT NULL DEFAULT 'MXN',
  duration_days   integer NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  is_featured     boolean NOT NULL DEFAULT false,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_plan_products (
  plan_id     uuid NOT NULL REFERENCES store_membership_plans (id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES store_products (id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, product_id)
);

CREATE TABLE IF NOT EXISTS store_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES store_users (id) ON DELETE SET NULL,
  guest_email   text,
  kind          text NOT NULL,
  product_id    uuid REFERENCES store_products (id) ON DELETE SET NULL,
  plan_id       uuid REFERENCES store_membership_plans (id) ON DELETE SET NULL,
  amount_cents  integer NOT NULL DEFAULT 0,
  currency      text NOT NULL DEFAULT 'MXN',
  gateway       text NOT NULL,
  status        text NOT NULL DEFAULT 'pending',
  gateway_ref   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  paid_at       timestamptz,
  CONSTRAINT store_orders_kind_chk CHECK (kind IN ('product', 'membership')),
  CONSTRAINT store_orders_gateway_chk CHECK (gateway IN ('mercadopago', 'paypal', 'stripe')),
  CONSTRAINT store_orders_status_chk CHECK (status IN ('pending', 'paid', 'failed', 'canceled'))
);

CREATE INDEX IF NOT EXISTS store_orders_status_idx ON store_orders (status, created_at DESC);

CREATE TABLE IF NOT EXISTS store_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES store_users (id) ON DELETE CASCADE,
  plan_id     uuid NOT NULL REFERENCES store_membership_plans (id),
  order_id    uuid REFERENCES store_orders (id) ON DELETE SET NULL,
  status      text NOT NULL DEFAULT 'pending',
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_memberships_status_chk CHECK (status IN ('pending', 'active', 'expired', 'canceled'))
);

CREATE INDEX IF NOT EXISTS store_memberships_user_idx ON store_memberships (user_id, status);

CREATE TABLE IF NOT EXISTS store_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES store_orders (id) ON DELETE CASCADE,
  gateway           text NOT NULL,
  gateway_event_id  text NOT NULL UNIQUE,
  raw               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS store_deliveries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text,
  product_id  uuid REFERENCES store_products (id) ON DELETE SET NULL,
  order_id    uuid REFERENCES store_orders (id) ON DELETE SET NULL,
  source      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT store_deliveries_source_chk CHECK (source IN ('free', 'paid', 'vip', 'resend'))
);

CREATE INDEX IF NOT EXISTS store_deliveries_email_idx ON store_deliveries (email);

CREATE TABLE IF NOT EXISTS store_download_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  text NOT NULL UNIQUE,
  order_id    uuid REFERENCES store_orders (id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES store_products (id) ON DELETE CASCADE,
  uses_left   integer NOT NULL DEFAULT 3,
  expires_at  timestamptz NOT NULL
);
