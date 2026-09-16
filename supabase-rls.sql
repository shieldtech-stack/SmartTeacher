-- SmartTeacher Row Level Security (RLS) policies
-- Run AFTER supabase-schema.sql (or against an existing database) in the Supabase SQL editor.
-- This makes user data private to each account: every row is tied to auth.uid().

-- ── 1. Auto-create a profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2. Profiles: each user manages only their own row ────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ── 3. Curriculum reference data: readable by everyone, not writable ─────────
ALTER TABLE curricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "curricula_public_read" ON curricula;
CREATE POLICY "curricula_public_read" ON curricula
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "subjects_public_read" ON subjects;
CREATE POLICY "subjects_public_read" ON subjects
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "strands_public_read" ON strands;
CREATE POLICY "strands_public_read" ON strands
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "subtopics_public_read" ON subtopics;
CREATE POLICY "subtopics_public_read" ON subtopics
  FOR SELECT TO anon, authenticated USING (true);

-- ── 4. Uploaded files & chunks: owner-only ───────────────────────────────────
ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_files_owner_all" ON user_files;
CREATE POLICY "user_files_owner_all" ON user_files
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chunks_owner_all" ON document_chunks;
CREATE POLICY "chunks_owner_all" ON document_chunks
  FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM user_files WHERE id = document_chunks.file_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM user_files WHERE id = document_chunks.file_id)
  );

-- ── 5. Generated documents: owner-only ───────────────────────────────────────
ALTER TABLE schemes_of_work ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schemes_owner_all" ON schemes_of_work;
CREATE POLICY "schemes_owner_all" ON schemes_of_work
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plans_owner_all" ON lesson_plans;
CREATE POLICY "plans_owner_all" ON lesson_plans
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notes_owner_all" ON lesson_notes;
CREATE POLICY "notes_owner_all" ON lesson_notes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 6. Server-side sync queue: owner-only ────────────────────────────────────
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sync_queue_owner_all" ON sync_queue;
CREATE POLICY "sync_queue_owner_all" ON sync_queue
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 7. Indexes to make owner lookups fast ────────────────────────────────────
CREATE INDEX IF NOT EXISTS user_files_user_id_idx ON user_files (user_id);
CREATE INDEX IF NOT EXISTS schemes_user_id_idx ON schemes_of_work (user_id);
CREATE INDEX IF NOT EXISTS plans_user_id_idx ON lesson_plans (user_id);
CREATE INDEX IF NOT EXISTS notes_user_id_idx ON lesson_notes (user_id);
CREATE INDEX IF NOT EXISTS chunks_file_id_idx ON document_chunks (file_id);