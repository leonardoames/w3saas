CREATE TABLE IF NOT EXISTS lesson_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);
ALTER TABLE lesson_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson likes" ON lesson_likes
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS lesson_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);
ALTER TABLE lesson_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lesson favorites" ON lesson_favorites
  FOR ALL USING (auth.uid() = user_id);
