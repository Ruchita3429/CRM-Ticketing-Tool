const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');
const verifyToken = require('../middleware/verifyToken');
const { ticketSchema } = require('../validations/ticket');

const router = express.Router();

const VALID_STATUSES = ['Open', 'In Progress', 'Closed'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

router.use(verifyToken);

function generateNextTicketId() {
  const last = db
    .prepare(
      `SELECT ticket_id FROM tickets
       WHERE ticket_id LIKE 'TKT-%'
       ORDER BY CAST(SUBSTR(ticket_id, 5) AS INTEGER) DESC
       LIMIT 1`
    )
    .get();

  const nextNum = last ? parseInt(last.ticket_id.replace('TKT-', ''), 10) + 1 : 1;
  return `TKT-${String(nextNum).padStart(3, '0')}`;
}

function findTicketByPublicId(ticketId) {
  return db.prepare('SELECT * FROM tickets WHERE ticket_id = ?').get(ticketId);
}

// GET /api/tickets/stats/summary
router.get('/stats/summary', (req, res, next) => {
  try {
    const stats = db
      .prepare(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'Open' THEN 1 ELSE 0 END) AS open,
           SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgress,
           SUM(CASE WHEN status = 'Closed' THEN 1 ELSE 0 END) AS closed,
           SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) AS highPriority
         FROM tickets`
      )
      .get();

    res.json({
      total: stats.total,
      open: stats.open,
      inProgress: stats.inProgress,
      closed: stats.closed,
      highPriority: stats.highPriority,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', (req, res, next) => {
  try {
    const result = ticketSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.flatten().fieldErrors,
      });
    }

    const { customer_name, customer_email, subject, description, priority } = result.data;

    const id = uuidv4();
    const ticket_id = generateNextTicketId();
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    db.prepare(
      `INSERT INTO tickets (
         id, ticket_id, customer_name, customer_email, subject, description,
         status, priority, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)`
    ).run(
      id,
      ticket_id,
      customer_name,
      customer_email,
      subject,
      description,
      priority,
      now,
      now
    );

    res.status(201).json({
      ticket_id,
      created_at: now,
      message: 'Ticket created',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets
router.get('/', (req, res, next) => {
  try {
    const { status, search, priority, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter.' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority filter.' });
    }

    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (priority) {
      conditions.push('priority = ?');
      params.push(priority);
    }

    if (search) {
      const term = `%${search}%`;
      conditions.push(
        `(customer_name LIKE ? OR customer_email LIKE ? OR subject LIKE ? OR description LIKE ? OR ticket_id LIKE ?)`
      );
      params.push(term, term, term, term, term);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const total = db
      .prepare(`SELECT COUNT(*) AS count FROM tickets ${whereClause}`)
      .get(...params).count;

    const rows = db
      .prepare(
        `SELECT ticket_id, customer_name, customer_email, subject, status, priority, created_at
         FROM tickets ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .all(...params, limitNum, offset);

    res.json({
      tickets: rows,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:ticket_id
router.get('/:ticket_id', (req, res, next) => {
  try {
    const ticket = findTicketByPublicId(req.params.ticket_id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const notes = db
      .prepare(
        `SELECT n.id, n.note_text, u.username AS created_by, n.created_at
         FROM notes n
         JOIN users u ON n.created_by = u.id
         WHERE n.ticket_id = ?
         ORDER BY n.created_at ASC`
      )
      .all(ticket.id);

    const { id, assigned_to, ...publicTicket } = ticket;

    res.json({ ...publicTicket, notes });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:ticket_id
router.put('/:ticket_id', (req, res, next) => {
  try {
    const { status, note_text } = req.body;

    if (status === undefined && note_text === undefined) {
      return res.status(400).json({ error: 'Provide status and/or note_text to update.' });
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const ticket = findTicketByPublicId(req.params.ticket_id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const updateTicket = db.transaction(() => {
      if (note_text) {
        db.prepare(
          `INSERT INTO notes (id, ticket_id, note_text, created_by, created_at)
           VALUES (?, ?, ?, ?, ?)`
        ).run(uuidv4(), ticket.id, note_text, req.user.id, now);
      }

      if (status !== undefined) {
        db.prepare(
          `UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`
        ).run(status, now, ticket.id);
      } else if (note_text) {
        db.prepare(`UPDATE tickets SET updated_at = ? WHERE id = ?`).run(now, ticket.id);
      }
    });

    updateTicket();

    res.json({ success: true, updated_at: now });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
