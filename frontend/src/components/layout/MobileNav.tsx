import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Compass, Search, MessageCircle, Bell } from 'lucide-react'
import { notificationsApi } from '../../api/notifications'
import { messagesApi } from '../../api/messages'
import { useAuth } from '../../context/AuthContext'
import { cn } from '../../lib/utils'

export default function MobileNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    if (!user) return
    const fetchCounts = async () => {
      try {
        const [notifsRes, convsRes] = await Promise.all([
          notificationsApi.getUnreadCount(),
          messagesApi.listConversations(),
        ])
        setUnreadNotifs(notifsRes.data.count)
        const totalUnread = convsRes.data.items.reduce((sum, c) => sum + c.unread_count, 0)
        setUnreadMessages(totalUnread)
      } catch { /* ignore */ }
    }
    fetchCounts()
    const interval = setInterval(fetchCounts, 15000)
    window.addEventListener('badges:refresh', fetchCounts)
    return () => { clearInterval(interval); window.removeEventListener('badges:refresh', fetchCounts) }
  }, [user])

  const items = [
    { path: '/', icon: Home, label: 'Feed', testId: 'nav-feed-mobile', badge: 0 },
    { path: '/explore', icon: Compass, label: 'Explore', testId: 'nav-explore-mobile', badge: 0 },
    { path: '/search', icon: Search, label: 'Search', testId: 'nav-search-mobile', badge: 0 },
    { path: '/messages', icon: MessageCircle, label: 'Messages', testId: 'nav-messages-mobile', badge: unreadMessages },
    { path: '/notifications', icon: Bell, label: 'Alerts', testId: 'nav-notifications-mobile', badge: unreadNotifs },
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        {items.map(({ path, icon: Icon, label, testId, badge }) => (
          <Link
            key={path}
            to={path}
            data-testid={testId}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-1 text-xs relative',
              pathname === path ? 'text-brand-600' : 'text-gray-500'
            )}
          >
            <div className="relative">
              <Icon size={20} />
              {badge > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
