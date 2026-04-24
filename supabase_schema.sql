-- STRUKTUR PRODUKSI TERBARU & TERAMANKAN UNTUK ARCUS ARCHERY
-- Jalankan kode ini di SQL Editor Supabase Anda.
-- PERHATIAN: Jalankan "DROP TABLE ..." di bawah jika Anda ingin reset total (Data akan hilang).

-- 1. BERSIHKAN LAMA (Hapus tanda komentarnya jika ingin reset total)
-- DROP TABLE IF EXISTS events CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS system_configs CASCADE;

-- 2. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. TABEL PROFILES (Biodata Pengguna)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'organizer', -- 'organizer', 'scorer', 'superadmin'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Pastikan kolom 'role' ada (Jika tabel sudah ada dari versi lama)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'organizer';
    END IF;
END $$;

-- 4. TABEL EVENTS (Turnamen)
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABEL SYSTEM_CONFIGS (Pengaturan Global)
CREATE TABLE IF NOT EXISTS system_configs (
    id TEXT PRIMARY KEY DEFAULT 'global',
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. AKTIFKAN RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- 7. KEBIJAKAN KEAMANAN (POLICIES)
DO $$ BEGIN
    -- Bersihkan kebijakan lama agar tidak bentrok
    DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Events viewable by everyone" ON events;
    DROP POLICY IF EXISTS "Users manage own events" ON events;
    DROP POLICY IF EXISTS "Configs viewable by everyone" ON system_configs;
    DROP POLICY IF EXISTS "Superadmins update configs" ON system_configs;
    
    -- Kebijakan lama dari versi sebelumnya
    DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
    DROP POLICY IF EXISTS "Events are viewable by everyone" ON events;
    DROP POLICY IF EXISTS "Users can manage own events" ON events;
    DROP POLICY IF EXISTS "Configs are viewable by everyone" ON system_configs;
    DROP POLICY IF EXISTS "Only superadmins can update configs" ON system_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Create New Policies
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Events viewable by everyone" ON events FOR SELECT USING (true);
CREATE POLICY "Users manage own events" ON events FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Configs viewable by everyone" ON system_configs FOR SELECT USING (true);
CREATE POLICY "Superadmins update configs" ON system_configs FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'superadmin'
    )
);

-- 8. OTOMASI PROFILE SAAT SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'User Baru'), 
    new.email, 
    'organizer'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
