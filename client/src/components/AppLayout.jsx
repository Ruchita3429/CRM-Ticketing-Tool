import { LayoutDashboard, LogOut, PlusCircle, Ticket } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket, end: true },
  { to: '/tickets/new', label: 'New Ticket', icon: PlusCircle, end: true },
]

function getInitials(username) {
  if (!username) return 'U'
  return username
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="sidebar-logo">
            <span className="logo-dot" />
            <h1>SupportDesk</h1>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-tile">
            <div className="avatar">{getInitials(user?.username || user?.email)}</div>
            <div>
              <p className="user-name">{user?.username || 'User'}</p>
              <span className="role-badge">{user?.role || 'agent'}</span>
            </div>
          </div>

          <button type="button" className="btn-pill sidebar-logout" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
