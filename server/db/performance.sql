CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS tickets_created_at_idx ON tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets (status);
CREATE INDEX IF NOT EXISTS tickets_priority_idx ON tickets (priority);
CREATE INDEX IF NOT EXISTS tickets_customer_name_trgm_idx ON tickets USING gin (customer_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_customer_email_trgm_idx ON tickets USING gin (customer_email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_subject_trgm_idx ON tickets USING gin (subject gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_description_trgm_idx ON tickets USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS tickets_ticket_id_trgm_idx ON tickets USING gin (ticket_id gin_trgm_ops);
