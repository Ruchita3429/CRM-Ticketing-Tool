const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'crm.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Closed')),
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
      assigned_to TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      note_text TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
    CREATE INDEX IF NOT EXISTS idx_tickets_ticket_id ON tickets(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_customer_name ON tickets(customer_name);
    CREATE INDEX IF NOT EXISTS idx_tickets_customer_email ON tickets(customer_email);

    CREATE VIRTUAL TABLE IF NOT EXISTS tickets_fts USING fts5(
      customer_name,
      customer_email,
      subject,
      description,
      ticket_id,
      content='tickets',
      content_rowid='rowid',
      tokenize='unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS tickets_ai AFTER INSERT ON tickets BEGIN
      INSERT INTO tickets_fts(rowid, customer_name, customer_email, subject, description, ticket_id)
      VALUES (new.rowid, new.customer_name, new.customer_email, new.subject, new.description, new.ticket_id);
    END;

    CREATE TRIGGER IF NOT EXISTS tickets_ad AFTER DELETE ON tickets BEGIN
      INSERT INTO tickets_fts(tickets_fts, rowid, customer_name, customer_email, subject, description, ticket_id)
      VALUES('delete', old.rowid, old.customer_name, old.customer_email, old.subject, old.description, old.ticket_id);
    END;

    CREATE TRIGGER IF NOT EXISTS tickets_au AFTER UPDATE ON tickets BEGIN
      INSERT INTO tickets_fts(tickets_fts, rowid, customer_name, customer_email, subject, description, ticket_id)
      VALUES('delete', old.rowid, old.customer_name, old.customer_email, old.subject, old.description, old.ticket_id);
      INSERT INTO tickets_fts(rowid, customer_name, customer_email, subject, description, ticket_id)
      VALUES (new.rowid, new.customer_name, new.customer_email, new.subject, new.description, new.ticket_id);
    END;
  `);

  db.exec(`INSERT INTO tickets_fts(tickets_fts) VALUES('rebuild');`);
}

module.exports = { db, initSchema, dbPath };
