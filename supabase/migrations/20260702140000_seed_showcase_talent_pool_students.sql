-- Seed 19 associates (from public.profiles) as SHOWCASE Talent Pool students:
-- visible to companies, but with NO login (unusable password hash), NO email,
-- and NO CV / cover letter yet. The company-facing card detects the missing
-- documents and shows a "CV & cover letter coming soon" badge.
--
-- To appear in talent_pool_get_students_for_company() a student needs:
--   role=STUDENT, registration_status=APPROVED, status=active_member,
--   profile_visible_to_companies=true, access_status=UNLOCKED.
--
-- Idempotent: re-running skips associates already seeded (deterministic email
-- showcase.<profile_id>@careerpilot.internal). To undo, delete the
-- talent_pool_users rows whose email starts with 'showcase.' (cascades the
-- student_profiles via user_id).

WITH picked AS (
  SELECT id,
         trim(first_name) AS fn,
         trim(last_name)  AS ln,
         photo_url,
         linkedin_url
  FROM public.profiles
  WHERE role = 'ASSOCIATE'
    AND id IN (
      'd07354c3-d356-4589-b88d-34af01eb0659', -- Adam Aslam
      '80fe19ad-bd96-4316-b6f0-5c8f064f7a04', -- Andrea Alivernini
      'c3ed7637-bee3-4b0a-ae5b-bde26c45f70e', -- Ben Preece
      'fa7960e4-aced-419c-9a42-2228462334c5', -- Carlo Giuseppe Antonio Marigliano
      '6e584680-08dc-4ac5-8f0a-31f3a6a669d8', -- Cesare Carlucci Pieri
      '7d9518aa-6221-4c26-9f4b-9bc982ef6326', -- Elisabetta Fabris
      'c8e64191-c5a7-482c-bbe9-55641245817e', -- Gianluca De Goyzueta
      'aac56fcd-78b4-40de-8fd7-8292127580b2', -- Gianmarco Picozzi
      'baa9b13e-0949-4b8c-98f4-5c9d9b949635', -- Killian Wabi
      'd48d57da-7552-4987-bd5c-7c1bf7817614', -- Livia Segatori
      '2f1803c9-cb68-479b-ad25-1fcf3cfd0e18', -- Lorenzo Fruttero
      'b3d7dd18-1286-4e9f-bcd3-7430ea9b79ad', -- Louis Ashford
      '07cb66c2-6a81-4657-a41a-b01df14d27da', -- Maisie Phung
      '6116fbf9-bc00-465f-b233-3735ddb6c06b', -- Nicolò Pietro Zanussi
      '7a67b6b3-5fc4-4eb0-b659-fc6f34137034', -- Riccardo Ciardelli
      '83da8f19-5500-4ca7-a900-fa6b6db85ab0', -- Riccardo Fassio
      '7b979393-900a-4b53-9708-58dad419fbe0', -- Siddhart Cross
      '3a4ff102-9b80-418c-8bd3-8d264704ba92', -- Zehaan Suri
      '48986e17-800d-4b19-aae1-da0b105d7642'  -- Zeyu Wang
    )
),
new_users AS (
  INSERT INTO public.talent_pool_users (email, password_hash, role, registration_status, status, approved_at)
  SELECT
    'showcase.' || p.id || '@careerpilot.internal',
    'SHOWCASE_NO_LOGIN',
    'STUDENT'::talent_pool_role,
    'APPROVED'::registration_status,
    'active_member'::talent_pool_user_status,
    now()
  FROM picked p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.talent_pool_users u
    WHERE u.email = 'showcase.' || p.id || '@careerpilot.internal'
  )
  RETURNING id, email
)
INSERT INTO public.student_profiles
  (user_id, first_name, last_name, phone, photo_url, linkedin_url, access_status, profile_visible_to_companies)
SELECT
  nu.id, p.fn, p.ln, '', p.photo_url, p.linkedin_url, 'UNLOCKED'::access_status, true
FROM new_users nu
JOIN picked p ON nu.email = 'showcase.' || p.id || '@careerpilot.internal';
