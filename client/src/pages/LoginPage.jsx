import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@crm.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (error) {
      const message = error?.response?.data?.error || 'Invalid credentials.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-center">
      <div className="crm-card login-card">
        <div className="brand">
          <ShieldCheck size={28} />
          <h1>SupportDesk</h1>
        </div>
        <p className="muted">Sign in to manage customer support tickets</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@crm.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button className="btn-pill" type="submit" disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p className="demo-credentials">
          Demo: <strong>admin@crm.com</strong> / <strong>admin123</strong>
        </p>
      </div>
    </div>
  )
}

export default LoginPage
