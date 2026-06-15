-- Update the handle_new_user function to include linkedin_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
        status
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
        'pending'::user_status
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also update the linkedin_url for the existing "Prova definitiva" user
UPDATE public.profiles 
SET linkedin_url = 'https://www.linkedin.com/in/leone-fassio/'
WHERE id = '8ebea388-714f-4720-9313-1a08a69db75a';