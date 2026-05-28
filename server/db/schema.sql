CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text DEFAULT 'agent' CHECK (role IN ('admin','agent')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'Open' CHECK (status IN ('Open','In Progress','Closed')),
  priority text DEFAULT 'Medium' CHECK (priority IN ('Low','Medium','High')),
  assigned_to text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id text REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  note_text text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX tickets_search_idx ON tickets
USING gin(to_tsvector('english',
  customer_name || ' ' || customer_email || ' ' ||
  subject || ' ' || description || ' ' || ticket_id
));

CREATE INDEX tickets_created_at_idx ON tickets (created_at DESC);
CREATE INDEX tickets_status_idx ON tickets (status);
CREATE INDEX tickets_priority_idx ON tickets (priority);
CREATE INDEX tickets_customer_name_trgm_idx ON tickets USING gin (customer_name gin_trgm_ops);
CREATE INDEX tickets_customer_email_trgm_idx ON tickets USING gin (customer_email gin_trgm_ops);
CREATE INDEX tickets_subject_trgm_idx ON tickets USING gin (subject gin_trgm_ops);
CREATE INDEX tickets_description_trgm_idx ON tickets USING gin (description gin_trgm_ops);
CREATE INDEX tickets_ticket_id_trgm_idx ON tickets USING gin (ticket_id gin_trgm_ops);
