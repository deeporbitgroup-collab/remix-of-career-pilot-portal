-- Create custom types
CREATE TYPE public.user_role AS ENUM ('ASSOCIATE', 'PARTNER', 'ADMIN');
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.document_type AS ENUM ('CV', 'CONTRACT', 'PARTNER_DOC', 'ADMIN_TEMPLATE');
CREATE TYPE public.kpi_chart_type AS ENUM ('number', 'bar', 'pie');
CREATE TYPE public.consultation_status AS ENUM ('new', 'in_progress', 'closed');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    company_name TEXT,
    status user_status DEFAULT 'pending',
    email_verified_at TIMESTAMPTZ,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    two_fa_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create availability slots table
CREATE TABLE public.availability_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_slot UNIQUE (user_id, date, start_time)
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT TRUE,
    visibility TEXT DEFAULT 'OWNER',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create KPI definitions table
CREATE TABLE public.kpi_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    label TEXT NOT NULL,
    description TEXT,
    applies_to user_role NOT NULL,
    chart_type kpi_chart_type DEFAULT 'number',
    order_index INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create KPI values table
CREATE TABLE public.kpi_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_definition_id UUID NOT NULL REFERENCES public.kpi_definitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    value NUMERIC NOT NULL,
    updated_by_admin_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_kpi_value UNIQUE (kpi_definition_id, user_id)
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_admin_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_type TEXT,
    target_id UUID,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create consultations table (for Partners)
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status consultation_status DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login attempts table (for rate limiting)
CREATE TABLE public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address INET,
    success BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = role); -- Prevent role changes

CREATE POLICY "Admins can update any profile" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- Availability slots policies
CREATE POLICY "Associates can manage their availability" ON public.availability_slots
    FOR ALL USING (
        user_id = auth.uid() AND 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ASSOCIATE' AND status = 'approved'
        )
    );

CREATE POLICY "Admins can view all availability" ON public.availability_slots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- Documents policies  
CREATE POLICY "Users can view their own documents" ON public.documents
    FOR SELECT USING (user_id = auth.uid() OR visibility = 'PUBLIC');

CREATE POLICY "Admins can view all documents" ON public.documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

CREATE POLICY "Users can upload their own documents" ON public.documents
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own documents" ON public.documents
    FOR UPDATE USING (user_id = auth.uid());

-- KPI definitions policies
CREATE POLICY "Anyone can view enabled KPI definitions" ON public.kpi_definitions
    FOR SELECT USING (enabled = TRUE);

CREATE POLICY "Admins can manage KPI definitions" ON public.kpi_definitions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- KPI values policies
CREATE POLICY "Users can view their own KPI values" ON public.kpi_values
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all KPI values" ON public.kpi_values
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

CREATE POLICY "Admins can manage KPI values" ON public.kpi_values
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- Activity logs policies
CREATE POLICY "Admins can view activity logs" ON public.activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

CREATE POLICY "Admins can create activity logs" ON public.activity_logs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- Consultations policies
CREATE POLICY "Partners can manage their consultations" ON public.consultations
    FOR ALL USING (
        partner_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'PARTNER' AND status = 'approved'
        )
    );

CREATE POLICY "Admins can view all consultations" ON public.consultations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Create functions

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, phone, first_name, last_name, company_name, role, status)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'company_name',
        (new.raw_user_meta_data->>'role')::user_role,
        'pending'::user_status
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_availability_slots_updated_at BEFORE UPDATE ON public.availability_slots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_kpi_definitions_updated_at BEFORE UPDATE ON public.kpi_definitions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_kpi_values_updated_at BEFORE UPDATE ON public.kpi_values
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_consultations_updated_at BEFORE UPDATE ON public.consultations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Insert default KPI definitions
INSERT INTO public.kpi_definitions (key, label, description, applies_to, chart_type, order_index) VALUES
    ('calls_made', 'Chiamate Effettuate', 'Numero totale di chiamate effettuate', 'ASSOCIATE', 'bar', 1),
    ('clients_assisted', 'Clienti Assistiti', 'Numero di clienti assistiti', 'ASSOCIATE', 'number', 2),
    ('people_placed', 'Persone Collocate', 'Persone collocate in stage/colloquio/assunzione', 'ASSOCIATE', 'bar', 3),
    ('clients_brought', 'Clienti Portati', 'Nuovi clienti portati', 'ASSOCIATE', 'number', 4),
    ('associates_brought', 'Associates Portati', 'Nuovi associates portati', 'ASSOCIATE', 'number', 5),
    ('partnerships_brought', 'Partnership Portate', 'Nuove partnership create', 'ASSOCIATE', 'number', 6),
    ('consultations_supported', 'Consulenze Supportate', 'Consulenze in cui ci siamo appoggiati', 'PARTNER', 'bar', 1),
    ('clients_from_us', 'Clienti da Noi', 'Clienti arrivati tramite Career Pilot', 'PARTNER', 'number', 2),
    ('partner_people_placed', 'Persone Collocate', 'Persone collocate tramite partnership', 'PARTNER', 'bar', 3),
    ('partner_clients_brought', 'Clienti Portati', 'Nuovi clienti portati dal partner', 'PARTNER', 'number', 4),
    ('partner_associates_brought', 'Associates Portati', 'Nuovi associates portati dal partner', 'PARTNER', 'number', 5),
    ('partner_partnerships_brought', 'Partnership Portate', 'Nuove partnership create dal partner', 'PARTNER', 'number', 6);

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) VALUES 
    ('documents', 'documents', false),
    ('contracts', 'contracts', false),
    ('cv', 'cv', false);

-- Storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id IN ('documents', 'contracts', 'cv') AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own files" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('documents', 'contracts', 'cv') AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all files" ON storage.objects
    FOR SELECT USING (
        bucket_id IN ('documents', 'contracts', 'cv') AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
        )
    );

CREATE POLICY "Users can update their own files" ON storage.objects
    FOR UPDATE USING (
        bucket_id IN ('documents', 'contracts', 'cv') AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own files" ON storage.objects
    FOR DELETE USING (
        bucket_id IN ('documents', 'contracts', 'cv') AND
        auth.uid()::text = (storage.foldername(name))[1]
    );