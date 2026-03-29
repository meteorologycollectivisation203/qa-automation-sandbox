import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      toast.success('Welcome back!')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto shadow-lg shadow-brand-200">QA</div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">QA Sandbox</h1>
          <p className="text-gray-500 mt-1">Social Network for Test Automation Practice</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Sign in</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm" data-testid="auth-error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="auth-email-input"
                className="input-field"
                placeholder="admin@buzzhive.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="auth-password-input"
                className="input-field"
                placeholder="admin123"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              data-testid="auth-login-btn"
              className="btn-primary w-full"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 hover:underline">
              Sign up
            </Link>
          </p>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-400 text-center mb-2">Quick login (test accounts)</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { email: 'admin@buzzhive.com', password: 'admin123', label: 'Admin' },
                { email: 'alice@buzzhive.com', password: 'alice123', label: 'Alice' },
                { email: 'bob@buzzhive.com', password: 'bob123', label: 'Bob' },
                { email: 'mod@buzzhive.com', password: 'mod123', label: 'Moderator' },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.password) }}
                  className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
