
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  designation TEXT NOT NULL DEFAULT '',
  qualification TEXT NOT NULL DEFAULT '',
  role_type TEXT NOT NULL DEFAULT 'staff' CHECK (role_type IN ('staff', 'student')),
  photo_url TEXT,
  face_descriptor JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public read (no auth required for this kiosk app)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON public.profiles
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete" ON public.profiles
  FOR DELETE USING (true);

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Allow public access to profile photos
CREATE POLICY "Allow public upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-photos');

CREATE POLICY "Allow public read storage" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow public update storage" ON storage.objects
  FOR UPDATE USING (bucket_id = 'profile-photos');

CREATE POLICY "Allow public delete storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'profile-photos');
