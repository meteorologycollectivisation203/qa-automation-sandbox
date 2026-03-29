import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()
  const isDocs = pathname === '/docs'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen">
      {!isDocs && <Sidebar />}
      <main className={isDocs ? 'flex-1 w-full' : 'flex-1 max-w-2xl mx-auto px-4 py-6 pb-20 lg:pb-6 w-full'}>
        <Outlet />
      </main>
      {!isDocs && <MobileNav />}
    </div>
  )
}
