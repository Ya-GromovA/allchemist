-- PostgreSQL schema for moving school/access/device state out of JSON storage.
-- Safe to apply before runtime cutover: it creates tables only if they do not exist.

CREATE TABLE IF NOT EXISTS organizations (
  organization_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS schools (
  school_id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(organization_id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_sites (
  site_id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(school_id),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_licenses (
  license_id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(school_id),
  site_id TEXT REFERENCES school_sites(site_id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  price_rub INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_classes (
  class_id TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(school_id),
  site_id TEXT REFERENCES school_sites(site_id),
  title TEXT NOT NULL,
  subject TEXT,
  teacher_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS school_memberships (
  class_id TEXT REFERENCES school_classes(class_id),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  school_id TEXT REFERENCES schools(school_id),
  site_id TEXT REFERENCES school_sites(site_id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, user_id)
);

CREATE TABLE IF NOT EXISTS school_invite_codes (
  code TEXT PRIMARY KEY,
  school_id TEXT REFERENCES schools(school_id),
  site_id TEXT REFERENCES school_sites(site_id),
  class_id TEXT REFERENCES school_classes(class_id),
  role TEXT NOT NULL,
  title TEXT,
  subject TEXT,
  teacher_user_id TEXT,
  student_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  max_activations INTEGER NOT NULL DEFAULT 1,
  activations INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  activated_by_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS access_grants (
  grant_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  organization_id TEXT REFERENCES organizations(organization_id),
  school_id TEXT REFERENCES schools(school_id),
  site_id TEXT REFERENCES school_sites(site_id),
  license_id TEXT REFERENCES school_licenses(license_id),
  price_rub INTEGER,
  plan TEXT,
  module_id TEXT,
  feature TEXT,
  plans JSONB NOT NULL DEFAULT '[]'::jsonb,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_registry (
  user_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  label TEXT,
  platform TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  trusted_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, device_id)
);

CREATE TABLE IF NOT EXISTS device_recovery_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  school_id TEXT REFERENCES schools(school_id),
  class_id TEXT REFERENCES school_classes(class_id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_grants_user ON access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_school_invites_school_status ON school_invite_codes(school_id, status);
CREATE INDEX IF NOT EXISTS idx_school_memberships_user ON school_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_user ON device_registry(user_id);
