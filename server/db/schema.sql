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
