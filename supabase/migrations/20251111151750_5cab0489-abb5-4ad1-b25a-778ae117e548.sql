-- Create enum for associate request status
CREATE TYPE associate_request_status AS ENUM ('pending', 'accepted', 'rejected', 'completed');

-- Create client_associate_requests table
CREATE TABLE client_associate_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  associate_id UUID NOT NULL,
  service_id UUID NOT NULL REFERENCES client_services(id),
  university TEXT,
  sector TEXT,
  status associate_request_status DEFAULT 'pending',
  proposed_timeslots JSONB, -- Array of {date, time, duration}
  selected_timeslot JSONB,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create client_shared_documents table
CREATE TABLE client_shared_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by_type TEXT NOT NULL, -- 'client', 'associate', 'admin'
  uploaded_by_id UUID NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create client_meetings table
CREATE TABLE client_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_users(id),
  associate_id UUID NOT NULL,
  meeting_date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  google_meet_link TEXT,
  status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_associate_requests_client ON client_associate_requests(client_id);
CREATE INDEX idx_associate_requests_associate ON client_associate_requests(associate_id);
CREATE INDEX idx_shared_docs_project ON client_shared_documents(project_id);
CREATE INDEX idx_meetings_project ON client_meetings(project_id);
CREATE INDEX idx_meetings_associate ON client_meetings(associate_id);

-- Enable RLS
ALTER TABLE client_associate_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_shared_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_meetings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_associate_requests
CREATE POLICY "Clients can view their requests" ON client_associate_requests
  FOR SELECT USING (client_id IN (SELECT id FROM client_users));

CREATE POLICY "Associates can view requests to them" ON client_associate_requests
  FOR SELECT USING (associate_id = auth.uid());

CREATE POLICY "Clients can create requests" ON client_associate_requests
  FOR INSERT WITH CHECK (client_id IN (SELECT id FROM client_users));

CREATE POLICY "Associates can update their requests" ON client_associate_requests
  FOR UPDATE USING (associate_id = auth.uid());

CREATE POLICY "Admin full access to requests" ON client_associate_requests
  FOR ALL USING (true);

-- RLS Policies for client_shared_documents
CREATE POLICY "Project members can view documents" ON client_shared_documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM client_projects 
      WHERE client_id IN (SELECT id FROM client_users)
      OR associate_id = auth.uid()
    )
  );

CREATE POLICY "Project members can upload documents" ON client_shared_documents
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM client_projects 
      WHERE client_id IN (SELECT id FROM client_users)
      OR associate_id = auth.uid()
    )
  );

CREATE POLICY "Uploaders can delete their documents" ON client_shared_documents
  FOR DELETE USING (uploaded_by_id IN (SELECT id FROM client_users) OR uploaded_by_id = auth.uid());

CREATE POLICY "Admin full access to documents" ON client_shared_documents
  FOR ALL USING (true);

-- RLS Policies for client_meetings
CREATE POLICY "Clients can view their meetings" ON client_meetings
  FOR SELECT USING (client_id IN (SELECT id FROM client_users));

CREATE POLICY "Associates can view their meetings" ON client_meetings
  FOR SELECT USING (associate_id = auth.uid());

CREATE POLICY "Admin full access to meetings" ON client_meetings
  FOR ALL USING (true);

-- Enable realtime for client_admin_messages
ALTER PUBLICATION supabase_realtime ADD TABLE client_admin_messages;
ALTER TABLE client_admin_messages REPLICA IDENTITY FULL;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE client_associate_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE client_shared_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE client_meetings;

ALTER TABLE client_associate_requests REPLICA IDENTITY FULL;
ALTER TABLE client_shared_documents REPLICA IDENTITY FULL;
ALTER TABLE client_meetings REPLICA IDENTITY FULL;