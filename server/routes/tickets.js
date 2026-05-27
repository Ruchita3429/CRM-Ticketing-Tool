const express = require('express');
const { supabase } = require('../db/supabase');
const verifyToken = require('../middleware/verifyToken');
const { ticketSchema } = require('../validations/ticket');

const router = express.Router();

const VALID_STATUSES = ['Open', 'In Progress', 'Closed'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High'];

router.use(verifyToken);

async function generateNextTicketId() {
  const { data, error } = await supabase
    .from('tickets')
    .select('ticket_id')
    .like('ticket_id', 'TKT-%');

  if (error) throw error;

  const lastNum = (data || []).reduce((max, row) => {
    const match = /^TKT-(\d+)$/.exec(row.ticket_id || '');
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);

  return `TKT-${String(lastNum + 1).padStart(3, '0')}`;
}

async function findTicketByPublicId(ticketId) {
  const { data, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('ticket_id', ticketId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// GET /api/tickets/stats/summary
router.get('/stats/summary', async (req, res, next) => {
  try {
    const countTickets = (filters = {}) => {
      let query = supabase.from('tickets').select('id', { count: 'exact', head: true });

      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value);
      }

      return query;
    };

    const [total, open, inProgress, closed, highPriority] = await Promise.all([
      countTickets(),
      countTickets({ status: 'Open' }),
      countTickets({ status: 'In Progress' }),
      countTickets({ status: 'Closed' }),
      countTickets({ priority: 'High' }),
    ]);

    const firstError = [total, open, inProgress, closed, highPriority].find((result) => result.error);
    if (firstError) throw firstError.error;

    res.json({
      total: total.count || 0,
      open: open.count || 0,
      inProgress: inProgress.count || 0,
      closed: closed.count || 0,
      highPriority: highPriority.count || 0,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/tickets
router.post('/', async (req, res, next) => {
  try {
    const result = ticketSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.flatten().fieldErrors,
      });
    }

    const { customer_name, customer_email, subject, description, priority } = result.data;
    const ticket_id = await generateNextTicketId();
    const now = new Date().toISOString();

    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        ticket_id,
        customer_name,
        customer_email,
        subject,
        description,
        status: 'Open',
        priority,
        created_at: now,
        updated_at: now,
      })
      .select('ticket_id, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      ticket_id: ticket.ticket_id,
      created_at: ticket.created_at,
      message: 'Ticket created',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets
router.get('/', async (req, res, next) => {
  try {
    const { status, search, priority, page = '1', limit = '10' } = req.query;
    const searchTerm = typeof search === 'string' ? search.trim() : '';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status filter.' });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority filter.' });
    }

    let query = supabase
      .from('tickets')
      .select('ticket_id, customer_name, customer_email, subject, status, priority, created_at', {
        count: 'exact',
      });

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (searchTerm) {
      const escapedSearch = searchTerm
        .replace(/[^\w\s@.-]/g, ' ')
        .replace(/[%_]/g, '\\$&')
        .trim();

      if (escapedSearch) {
        query = query.or(
          [
            `customer_name.ilike.%${escapedSearch}%`,
            `customer_email.ilike.%${escapedSearch}%`,
            `subject.ilike.%${escapedSearch}%`,
            `description.ilike.%${escapedSearch}%`,
            `ticket_id.ilike.%${escapedSearch}%`,
          ].join(',')
        );
      }
    }

    const { data: rows, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) throw error;

    const total = count || 0;

    res.json({
      tickets: rows || [],
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickets/:ticket_id
router.get('/:ticket_id', async (req, res, next) => {
  try {
    const ticket = await findTicketByPublicId(req.params.ticket_id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const { data: notes, error } = await supabase
      .from('notes')
      .select('id, note_text, created_by, created_at')
      .eq('ticket_id', ticket.ticket_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const { id, assigned_to, ...publicTicket } = ticket;

    res.json({ ...publicTicket, notes: notes || [] });
  } catch (err) {
    next(err);
  }
});

// PUT /api/tickets/:ticket_id
router.put('/:ticket_id', async (req, res, next) => {
  try {
    const { status, note_text } = req.body;

    if (status === undefined && note_text === undefined) {
      return res.status(400).json({ error: 'Provide status and/or note_text to update.' });
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const ticket = await findTicketByPublicId(req.params.ticket_id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const { data: actor, error: actorError } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (actorError) throw actorError;

    if (!actor) {
      return res.status(401).json({ error: 'Session is no longer valid. Please log in again.' });
    }

    const now = new Date().toISOString();

    if (note_text) {
      const { error: noteError } = await supabase
        .from('notes')
        .insert({
          ticket_id: ticket.ticket_id,
          note_text,
          created_by: req.user.username,
          created_at: now,
        });

      if (noteError) throw noteError;
    }

    if (status !== undefined || note_text) {
      const updates = { updated_at: now };
      if (status !== undefined) updates.status = status;

      const { error: updateError } = await supabase
        .from('tickets')
        .update(updates)
        .eq('ticket_id', ticket.ticket_id);

      if (updateError) throw updateError;
    }

    res.json({ success: true, updated_at: now });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
