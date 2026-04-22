-- Execute against o mesmo Postgres do app (ex.: Neon) antes ou depois de alinhar o schema Drizzle.
-- Uso: psql "$DATABASE_URL_UNPOOLED" -f scripts/migrate-user-song-arrangement.sql

-- Remove FKs legadas para a tabela local "user". A autenticacao atual vem do
-- Neon Auth, entao essas colunas sao apenas IDs textuais do usuario autenticado.
ALTER TABLE "user_folder" DROP CONSTRAINT IF EXISTS "user_folder_user_id_user_id_fk";
ALTER TABLE "user_song" DROP CONSTRAINT IF EXISTS "user_song_user_id_user_id_fk";
ALTER TABLE "user_setlist" DROP CONSTRAINT IF EXISTS "user_setlist_user_id_user_id_fk";
ALTER TABLE "share_snapshot" DROP CONSTRAINT IF EXISTS "share_snapshot_created_by_user_id_user_id_fk";

ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "arrangement_id" text;
UPDATE "user_song" SET "arrangement_id" = "id" WHERE "arrangement_id" IS NULL;
ALTER TABLE "user_song" ALTER COLUMN "arrangement_id" SET NOT NULL;

ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "source_artist_slug" text;
ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "source_slug" text;
ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "youtube_id" text;
ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "ui_prefs" jsonb;
UPDATE "user_song"
SET
  "source_artist_slug" = COALESCE("source_artist_slug", "artist_slug"),
  "source_slug" = COALESCE("source_slug", "slug")
WHERE "source_artist_slug" IS NULL OR "source_slug" IS NULL;

DROP INDEX IF EXISTS "uq_user_song_folder";
DROP INDEX IF EXISTS "uq_user_song_recent";

CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_song_folder_arr"
  ON "user_song" ("user_id", "folder_id", "arrangement_id")
  WHERE "folder_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_song_recent_arr"
  ON "user_song" ("user_id", "arrangement_id")
  WHERE "folder_id" IS NULL AND "is_recent" = true;

-- Remove unique index de position em setlist items (conflita com reorder).
DROP INDEX IF EXISTS "uq_setlist_item_position";

-- ============================================================
-- Novas tabelas (setlists, share).
-- Se já existirem (ex.: db:push executado antes), os IF NOT EXISTS não fazem nada.
-- ============================================================

CREATE TABLE IF NOT EXISTS "user_setlist" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "position" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "user_setlist_item" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "setlist_id" text NOT NULL REFERENCES "user_setlist" ("id") ON DELETE CASCADE,
  "position" integer NOT NULL DEFAULT 0,
  "arrangement_id" text NOT NULL,
  "notes" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "share_snapshot" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "resource_type" text NOT NULL,
  "payload" jsonb NOT NULL,
  "created_by_user_id" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "share_token" (
  "token" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "snapshot_id" text NOT NULL REFERENCES "share_snapshot" ("id") ON DELETE CASCADE,
  "permission" text NOT NULL DEFAULT 'read',
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);
