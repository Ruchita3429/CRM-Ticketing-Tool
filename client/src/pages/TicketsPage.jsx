import { CheckCircle2, ChevronDown, Circle, Clock, Search, TicketX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api/axios'
import useDebouncedValue from '../hooks/useDebouncedValue'

const PAGE_SIZE = 10
const VALID_STATUSES = ['Open', 'In Progress', 'Closed']
const VALID_PRIORITIES = ['High', 'Medium', 'Low']

function getPageTitle(status, priority) {
  if (status !== 'All') return `${status} Tickets | SupportDesk`
  if (priority !== 'All') return `${priority} Priority Tickets | SupportDesk`
  return 'All Tickets | SupportDesk'
}

function getPageHeading(status, priority) {
  if (status !== 'All') return `${status} Tickets`
  if (priority !== 'All') return `${priority} Priority Tickets`
  return 'All Tickets'
}

function getStatusClass(status) {
  if (status === 'Open') return 'badge status-open'
  if (status === 'In Progress') return 'badge status-progress'
  return 'badge status-closed'
}

function getStatusIcon(status) {
  if (status === 'Open') return Circle
  if (status === 'In Progress') return Clock
  return CheckCircle2
}

function getPriorityDotClass(priority) {
  if (priority === 'High') return 'priority-dot high'
  if (priority === 'Medium') return 'priority-dot medium'
  return 'priority-dot low'
}

function getPageWindow(current, total) {
  const pages = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i += 1) pages.push(i)
  return pages
}

function TicketsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '')
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const debouncedSearchInput = useDebouncedValue(searchInput, 500)

  const rawStatus = searchParams.get('status')
  const rawPriority = searchParams.get('priority')
  const status = VALID_STATUSES.includes(rawStatus) ? rawStatus : 'All'
  const priority = VALID_PRIORITIES.includes(rawPriority) ? rawPriority : 'All'
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const searchQuery = searchParams.get('search') || ''
  const pageHeading = getPageHeading(status, priority)

  useEffect(() => {
    document.title = getPageTitle(status, priority)
    return () => {
      document.title = 'SupportDesk'
    }
  }, [status, priority])

  const hasActiveFilters =
    Boolean(searchParams.get('search')) || status !== 'All' || priority !== 'All'

  useEffect(() => {
    setSearchInput(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    const nextSearch = debouncedSearchInput.trim()

    if (nextSearch === searchQuery) return

    const params = new URLSearchParams(searchParams)
    if (nextSearch) {
      params.set('search', nextSearch)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    setSearchParams(params, { replace: true })
  }, [debouncedSearchInput, searchQuery, searchParams, setSearchParams])

  useEffect(() => {
    const controller = new AbortController()

    const fetchTickets = async () => {
      const firstLoad = tickets.length === 0 && isInitialLoading
      if (firstLoad) {
        setIsInitialLoading(true)
      } else {
        setIsRefreshing(true)
      }
      try {
        const query = new URLSearchParams()
        query.set('page', String(page))
        query.set('limit', String(PAGE_SIZE))
        if (status !== 'All') query.set('status', status)
        if (priority !== 'All') query.set('priority', priority)
        if (searchQuery) query.set('search', searchQuery)

        const response = await api.get(`/tickets?${query.toString()}`, {
          signal: controller.signal,
        })
        setTickets(response.data.tickets || [])
        setTotal(response.data.total || 0)
        setTotalPages(Math.max(1, response.data.totalPages || 1))
      } catch (error) {
        if (error?.code === 'ERR_CANCELED') return
        toast.error(error?.response?.data?.error || 'Failed to load tickets.')
      } finally {
        setIsInitialLoading(false)
        setIsRefreshing(false)
      }
    }

    fetchTickets()
    return () => controller.abort()
  }, [page, priority, searchQuery, status])

  const pageWindow = useMemo(() => getPageWindow(page, totalPages), [page, totalPages])

  const showingFrom = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const showingTo = Math.min(page * PAGE_SIZE, total)

  const updateFilterParam = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value === 'All') params.delete(key)
    else params.set(key, value)
    params.set('page', '1')
    setSearchParams(params)
  }

  const goToPage = (targetPage) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(targetPage))
    setSearchParams(params)
  }

  const clearFilters = () => {
    setSearchInput('')
    setSearchParams({})
  }

  return (
    <div className="tickets-page">
      <header className="tickets-header">
        <div className="tickets-title-wrap">
          <h2>{pageHeading}</h2>
          <span className="count-badge">{total}</span>
        </div>

        <Link className="btn-pill" to="/tickets/new">
          + New Ticket
        </Link>
      </header>

      <section className="tickets-filter-bar crm-card">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email, ID, subject..."
          />
        </div>

        <div className="select-wrap">
          <select
            value={status}
            onChange={(e) => updateFilterParam('status', e.target.value)}
          >
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Closed</option>
          </select>
          <ChevronDown size={16} />
        </div>

        <div className="select-wrap">
          <select
            value={priority}
            onChange={(e) => updateFilterParam('priority', e.target.value)}
          >
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <ChevronDown size={16} />
        </div>

        {hasActiveFilters && (
          <button type="button" className="btn-pill ghost" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </section>

      <section className="crm-card tickets-list-card">
        {isRefreshing && !isInitialLoading && (
          <div className="muted tickets-refreshing">Updating results...</div>
        )}
        <div className="table-wrap">
          <table className="tickets-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Customer Name</th>
                <th>Email</th>
                <th>Subject</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isInitialLoading
                ? Array.from({ length: 7 }).map((_, idx) => (
                    <tr key={idx}>
                      <td colSpan={8}>
                        <div className="skeleton skeleton-row" />
                      </td>
                    </tr>
                  ))
                : tickets.map((ticket) => (
                    <tr key={ticket.ticket_id}>
                      <td className="ticket-id-cell">{ticket.ticket_id}</td>
                      <td>{ticket.customer_name}</td>
                      <td>{ticket.customer_email}</td>
                      <td>{ticket.subject}</td>
                      <td>
                        {(() => {
                          const StatusIcon = getStatusIcon(ticket.status)
                          return (
                        <span className={`${getStatusClass(ticket.status)} badge-with-icon`}>
                          <StatusIcon size={14} />
                          {ticket.status}
                        </span>
                          )
                        })()}
                      </td>
                      <td>
                        <span className="priority-label">
                          <span className={getPriorityDotClass(ticket.priority)} />
                          {ticket.priority}
                        </span>
                      </td>
                      <td>{new Date(ticket.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="table-view-btn"
                          onClick={() => navigate(`/tickets/${ticket.ticket_id}`)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isInitialLoading && tickets.length === 0 && (
          <div className="tickets-empty">
            <TicketX size={50} />
            <h3>No tickets found</h3>
            <p className="muted">Try changing filters or search keywords.</p>
          </div>
        )}

        <footer className="pagination-wrap">
          <p className="muted">
            Showing {showingFrom}-{showingTo} of {total} tickets
          </p>

          <div className="pagination-controls">
            <button
              type="button"
              className="page-btn"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
              Previous
            </button>

            {pageWindow.map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`page-btn ${pageNum === page ? 'active' : ''}`}
                onClick={() => goToPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  )
}

export default TicketsPage
