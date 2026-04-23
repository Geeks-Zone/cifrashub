-- Pre-drizzle migration for arrangement identity, setlists, sharing, and
-- folder/user-id column alignment. Safe to run repeatedly.

ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "arrangement_id" text;
UPDATE "user_song" SET "arrangement_id" = "id" WHERE "arrangement_id" IS NULL;
ALTER TABLE "user_song" ALTER COLUMN "arrangement_id" SET NOT NULL;

ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "source_artist_slug" text;
ALTER TABLE "user_song" ADD COLUMN IF NOT EXISTS "source_slug" text;
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

DROP INDEX IF EXISTS "uq_setlist_item_position";

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

DO $$
BEGIN
  IF to_regclass('public.user_folder') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_folder'
        AND column_name = 'name'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_folder'
        AND column_name = 'title'
    ) THEN
      ALTER TABLE public.user_folder RENAME COLUMN "name" TO "title";
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_folder'
        AND column_name = 'name'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_folder'
        AND column_name = 'title'
    ) THEN
      UPDATE public.user_folder
      SET title = COALESCE(title, "name")
      WHERE title IS NULL;
    ELSIF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_folder'
        AND column_name = 'title'
    ) THEN
      ALTER TABLE public.user_folder ADD COLUMN title text;
    END IF;

    UPDATE public.user_folder SET title = 'Favoritos' WHERE title IS NULL;
    ALTER TABLE public.user_folder ALTER COLUMN title SET NOT NULL;
  END IF;
END $$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS table_name, conname
    FROM pg_constraint
    WHERE contype = 'f'
      AND conrelid = ANY(ARRAY_REMOVE(ARRAY[
        to_regclass('public.user_folder'),
        to_regclass('public.user_song'),
        to_regclass('public.user_setlist'),
        to_regclass('public.share_snapshot')
      ], NULL))
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.table_name, r.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.user_folder') IS NOT NULL THEN
    ALTER TABLE public.user_folder ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE public.user_folder ALTER COLUMN id TYPE uuid USING id::uuid;
    ALTER TABLE public.user_folder ALTER COLUMN id SET DEFAULT gen_random_uuid();
    ALTER TABLE public.user_folder ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;

  IF to_regclass('public.user_song') IS NOT NULL THEN
    ALTER TABLE public.user_song ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
    ALTER TABLE public.user_song ALTER COLUMN folder_id TYPE uuid USING folder_id::uuid;
  END IF;

  IF to_regclass('public.user_setlist') IS NOT NULL THEN
    ALTER TABLE public.user_setlist ALTER COLUMN user_id TYPE uuid USING user_id::uuid;
  END IF;

  IF to_regclass('public.share_snapshot') IS NOT NULL THEN
    ALTER TABLE public.share_snapshot
      ALTER COLUMN created_by_user_id TYPE uuid USING created_by_user_id::uuid;
  END IF;
END $$;
