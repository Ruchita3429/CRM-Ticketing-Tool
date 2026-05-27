import { ArrowUpRight, TrendingUp } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

function CountUpNumber({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let frameId
    const startTime = performance.now()

    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      setDisplay(Math.floor(value * progress))
      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameId)
  }, [value, duration])

  return <span>{display}</span>
}

function formatDateTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function getStatusClass(status) {
  if (status === 'Open') return 'badge status-open'
  if (status === 'In Progress') return 'badge status-progress'
  return 'badge status-closed'
}

function getPriorityClass(priority) {
  if (priority === 'High') return 'badge priority-high'
  if (priority === 'Medium') return 'badge priority-medium'
  return 'badge priority-low'
}

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [summary, setSummary] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    highPriority: 0,
  })
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [summaryRes, ticketsRes] = await Promise.all([
          api.get('/tickets/stats/summary'),
          api.get('/tickets?limit=10&page=1'),
        ])
        setSummary(summaryRes.data)
        setTickets(ticketsRes.data.tickets || [])
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const statCards = useMemo(
    () => [
      {
        label: 'Total Tickets',
        key: 'total',
        className: 'stat-blue',
        to: '/tickets',
        tooltip: 'all',
      },
      {
        label: 'Open',
        key: 'open',
        className: 'stat-yellow',
        to: '/tickets?status=Open',
        tooltip: 'Open',
      },
      {
        label: 'In Progress',
        key: 'inProgress',
        className: 'stat-purple',
        to: '/tickets?status=In%20Progress',
        tooltip: 'In Progress',
      },
      {
        label: 'Closed',
        key: 'closed',
        className: 'stat-green',
        to: '/tickets?status=Closed',
        tooltip: 'Closed',
      },
      {
        label: 'High Priority',
        key: 'highPriority',
        className: 'stat-red',
        to: '/tickets?priority=High',
        tooltip: 'High Priority',
      },
    ],
    [],
  )

  const handleStatNavigate = (to) => {
    navigate(to)
  }

  return (
    <div className="dashboard-wrap">
      <header className="dashboard-header">
        <div>
          <h2>Welcome back, {user?.username || 'Agent'} 👋</h2>
          <p className="muted">{formatDateTime(now)}</p>
        </div>
        <button
          type="button"
          className="btn-pill dashboard-header-cta"
          onClick={() => navigate('/tickets/new')}
        >
          + New Ticket
        </button>
      </header>

      <section className="stats-grid">
        {loading
          ? Array.from({ length: 5 }).map((_, idx) => (
              <article key={idx} className="crm-card stat-card skeleton-card">
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-number" />
                <div className="skeleton skeleton-line" />
              </article>
            ))
          : statCards.map((card) => (
              <article
                key={card.key}
                className={`crm-card stat-card stat-card-clickable ${card.className}`}
                onClick={() => handleStatNavigate(card.to)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleStatNavigate(card.to)
                  }
                }}
                role="button"
                tabIndex={0}
                title={`View ${card.tooltip} tickets`}
                aria-label={`View ${card.tooltip} tickets`}
              >
                <ArrowUpRight size={16} className="stat-card-arrow" aria-hidden />
                <p className="stat-label">{card.label}</p>
                <p className="stat-number">
                  <CountUpNumber value={summary[card.key] || 0} />
                </p>
                <div className="stat-meta">
                  <TrendingUp size={14} />
                  <span>Live</span>
                </div>
                <span className="stat-tooltip">View {card.tooltip} tickets</span>
              </article>
            ))}
      </section>

      <section className="crm-card tickets-table-card">
        <div className="table-head">
          <h3>Recent Tickets</h3>
          <span className="muted">Last 10</span>
        </div>

        <div className="table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Customer</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={6}>
                        <div className="skeleton skeleton-row" />
                      </td>
                    </tr>
                  ))
                : tickets.map((ticket) => (
                    <tr
                      key={ticket.ticket_id}
                      onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                    >
                      <td>{ticket.ticket_id}</td>
                      <td>{ticket.customer_name}</td>
                      <td>{ticket.subject}</td>
                      <td>
                        <span className={getStatusClass(ticket.status)}>
                          {ticket.status}
                        </span>
                      </td>
                      <td>
                        <span className={getPriorityClass(ticket.priority)}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && tickets.length === 0 && (
            <p className="muted empty-state">No tickets available yet.</p>
          )}
        </div>

        <button
          type="button"
          className="table-link"
          onClick={() => navigate('/tickets')}
        >
          View all tickets <ArrowUpRight size={14} />
        </button>
      </section>
    </div>
  )
}

export default DashboardPage
