CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    requested_role public.user_role := COALESCE((new.raw_user_meta_data->>'role')::public.user_role, 'ASSOCIATE'::public.user_role);
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
        requested_role,
        CASE
            WHEN requested_role = 'ASSOCIATE'::public.user_role THEN 'approved'::public.user_status
            ELSE 'pending'::public.user_status
        END,
        (new.raw_user_meta_data->'about_data')::jsonb,
        COALESCE((new.raw_user_meta_data->'languages')::jsonb, '[]'::jsonb),
        COALESCE((new.raw_user_meta_data->'certifications')::jsonb, '[]'::jsonb),
        (new.raw_user_meta_data->'profile_presentation')::jsonb
    );
    RETURN new;
END;
$function$;

UPDATE public.profiles
SET status = 'approved'::public.user_status
WHERE role = 'ASSOCIATE'::public.user_role
  AND status = 'pending'::public.user_status;