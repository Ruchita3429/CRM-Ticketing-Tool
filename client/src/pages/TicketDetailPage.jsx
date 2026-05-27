import { CheckCircle2, Circle, Clock, Loader2, MessageSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'

const STATUS_OPTIONS = [
  { value: 'Open', icon: Circle, className: 'status-card open' },
  { value: 'In Progress', icon: Clock, className: 'status-card progress' },
  { value: 'Closed', icon: CheckCircle2, className: 'status-card closed' },
]

function getInitials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getStatusClass(status) {
  if (status === 'Open') return 'badge status-open badge-lg'
  if (status === 'In Progress') return 'badge status-progress badge-lg'
  return 'badge status-closed badge-lg'
}

function getStatusIcon(status) {
  if (status === 'Open') return Circle
  if (status === 'In Progress') return Clock
  return CheckCircle2
}

function getPriorityClass(priority) {
  if (priority === 'High') return 'badge priority-high badge-lg'
  if (priority === 'Medium') return 'badge priority-medium badge-lg'
  return 'badge priority-low badge-lg'
}

function formatDate(value) {
  if (!value) return '—'
  const normalized = value.replace(' ', 'T')
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)
  const parsed = new Date(hasTimezone ? normalized : `${normalized}Z`)

  if (Number.isNaN(parsed.getTime())) return value

  return parsed.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function TicketDetailPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('Open')
  const [noteText, setNoteText] = useState('')

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get(`/tickets/${id}`)
      setTicket(response.data)
      setSelectedStatus(response.data.status)
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to load ticket.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  const handleSaveUpdate = async () => {
    const hasStatusChange = selectedStatus !== ticket?.status
    const hasNote = noteText.trim().length > 0

    if (!hasStatusChange && !hasNote) {
      toast.error('Change status or add a note before saving.')
      return
    }

    setSaving(true)
    try {
      const payload = {}
      if (hasStatusChange) payload.status = selectedStatus
      if (hasNote) payload.note_text = noteText.trim()

      await api.put(`/tickets/${id}`, payload)
      toast.success('Ticket updated successfully.', {
        style: { border: '1px solid rgba(16, 185, 129, 0.4)' },
      })
      setNoteText('')
      await fetchTicket()
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to update ticket.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="ticket-detail-page">
        <div className="detail-grid">
          <div className="detail-main">
            <div className="skeleton skeleton-title-lg" />
            <div className="skeleton skeleton-line" />
            <div className="info-grid-skeleton">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="skeleton skeleton-block" />
              ))}
            </div>
            <div className="skeleton skeleton-desc" />
            <div className="skeleton skeleton-desc" />
          </div>
          <aside className="detail-sidebar">
            <div className="skeleton skeleton-sidebar-card" />
            <div className="skeleton skeleton-sidebar-card" />
          </aside>
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="crm-card">
          <h2>Ticket not found</h2>
          <Link className="back-link" to="/tickets">
            ← Back to Tickets
          </Link>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(ticket.status)

  return (
    <div className="ticket-detail-page">
      <Link className="back-link" to="/tickets">
        ← Back to Tickets
      </Link>

      <div className="detail-grid">
        <div className="detail-main">
          <header className="ticket-detail-header">
            <p className="ticket-id-large">{ticket.ticket_id}</p>
            <h2>{ticket.subject}</h2>
            <div className="badge-row">
              <span className={`${getStatusClass(ticket.status)} badge-with-icon`}>
                <StatusIcon size={14} />
                {ticket.status}
              </span>
              <span className={getPriorityClass(ticket.priority)}>{ticket.priority}</span>
            </div>
          </header>

          <section className="crm-card info-grid-card">
            <div className="info-grid">
              <div>
                <p className="info-label">Customer</p>
                <p>{ticket.customer_name}</p>
              </div>
              <div>
                <p className="info-label">Email</p>
                <p>{ticket.customer_email}</p>
              </div>
              <div>
                <p className="info-label">Created</p>
                <p>{formatDate(ticket.created_at)}</p>
              </div>
              <div>
                <p className="info-label">Last Updated</p>
                <p>{formatDate(ticket.updated_at)}</p>
              </div>
            </div>
          </section>

          <section className="crm-card description-card">
            <h3>Description</h3>
            <div className="description-inset">
              <p>{ticket.description}</p>
            </div>
          </section>

          <section className="crm-card notes-card">
            <h3>Activity Timeline</h3>
            {ticket.notes?.length ? (
              <ul className="notes-timeline">
                {ticket.notes.map((note) => (
                  <li key={note.id} className="note-item">
                    <div className="note-avatar">{getInitials(note.created_by)}</div>
                    <div>
                      <div className="note-meta">
                        <strong>{note.created_by}</strong>
                        <span className="muted">{formatDate(note.created_at)}</span>
                      </div>
                      <p className="note-text">{note.note_text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="notes-empty">
                <MessageSquare size={28} />
                <p>No notes yet</p>
              </div>
            )}
          </section>
        </div>

        <aside className="detail-sidebar">
          <div className="crm-card update-card sticky-card">
            <h3>Update Ticket</h3>

            <p className="info-label">Status</p>
            <div className="status-card-grid">
              {STATUS_OPTIONS.map((option) => {
                const Icon = option.icon
                const selected = selectedStatus === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${option.className} ${selected ? 'selected' : ''}`}
                    onClick={() => setSelectedStatus(option.value)}
                  >
                    <Icon size={18} />
                    <span>{option.value}</span>
                  </button>
                )
              })}
            </div>

            <label className="note-field">
              Add Note
              <textarea
                rows={4}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note..."
              />
            </label>

            <button
              type="button"
              className="btn-pill submit-full"
              onClick={handleSaveUpdate}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="spin" />
                  Saving...
                </>
              ) : (
                'Save Update'
              )}
            </button>
          </div>

          <div className="crm-card meta-card sticky-card">
            <h3>Metadata</h3>
            <dl className="meta-list">
              <div>
                <dt>Ticket ID</dt>
                <dd className="ticket-id-large">{ticket.ticket_id}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(ticket.created_at)}</dd>
              </div>
              <div>
                <dt>Last Updated</dt>
                <dd>{formatDate(ticket.updated_at)}</dd>
              </div>
              <div>
                <dt>Priority</dt>
                <dd>{ticket.priority}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default TicketDetailPage
