-- Add new columns to store registration data from the new signup form
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS about_data JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS languages JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS profile_presentation JSONB DEFAULT NULL;

-- Add comments to explain the structure
COMMENT ON COLUMN public.profiles.about_data IS 'JSON object containing detailed registration data based on user status (university_student, master_student, professional)';
COMMENT ON COLUMN public.profiles.languages IS 'JSON array of languages with language name and level (native, advanced, intermediate, basic)';
COMMENT ON COLUMN public.profiles.certifications IS 'JSON array of certifications with name, issuingBody, and year';
COMMENT ON COLUMN public.profiles.profile_presentation IS 'JSON object indicating which presentation methods the user chose (useLinkedIn, useCv, useAbout)';

-- Update the handle_new_user function to capture the new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        phone, 
        first_name, 
        last_name, 
        company_name, 
        linkedin_url,
        role, 
        status,
        about_data,
        languages,
        certifications,
        profile_presentation
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        COALESCE(new.raw_user_meta_data->>'company_name', ''),
        new.raw_user_meta_data->>'linkedin_url',
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'ASSOCIATE'::user_role),
        'pending'::user_status,
        (new.raw_user_meta_data->'about_data')::jsonb,
        COALESCE((new.raw_user_meta_data->'languages')::jsonb, '[]'::jsonb),
        COALESCE((new.raw_user_meta_data->'certifications')::jsonb, '[]'::jsonb),
        (new.raw_user_meta_data->'profile_presentation')::jsonb
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;