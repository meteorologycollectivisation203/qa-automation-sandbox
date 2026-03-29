import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, Repeat2, Bell, Check, Filter } from 'lucide-react'
import { notificationsApi } from '../../api/notifications'
import { formatDistanceToNow } from 'date-fns'
import { cn, tid } from '../../lib/utils'
import type { Notification } from '../../types'

const iconMap: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageCircle,
  follow: UserPlus,
  follow_request: UserPlus,
  repost: Repeat2,
  mention: Bell,
  message: MessageCircle,
}

const colorMap: Record<string, string> = {
  like: 'bg-red-100 text-red-600',
  comment: 'bg-blue-100 text-blue-600',
  follow: 'bg-green-100 text-green-600',
  follow_request: 'bg-yellow-100 text-yellow-600',
  repost: 'bg-emerald-100 text-emerald-600',
  mention: 'bg-purple-100 text-purple-600',
  message: 'bg-brand-100 text-brand-600',
}

const textMap: Record<string, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  follow_request: 'requested to follow you',
  repost: 'reposted your post',
  mention: 'mentioned you',
  message: 'sent you a message',
}

function getNotificationLink(n: Notification): string | null {
  if (n.type === 'follow' || n.type === 'follow_request') {
    return n.actor ? `/profile/${n.actor.username}` : null
  }
  if ((n.type === 'like' || n.type === 'comment' || n.type === 'repost') && n.target_type === 'post' && n.target_id) {
    return `/post/${n.target_id}`
  }
  if (n.type === 'message') return '/messages'
  return null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const load = async () => {
    try {
      const params: { is_read?: boolean } = {}
      if (filter === 'unread') params.is_read = false
      const res = await notificationsApi.list(params)
      setNotifications(res.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const refreshBadges = () => window.dispatchEvent(new Event('badges:refresh'))

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead()
    load()
    refreshBadges()
  }

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id)
    load()
    refreshBadges()
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-brand-600 text-white text-xs rounded-full px-2 py-0.5" data-testid="notifications-unread-badge">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setFilter('all')}
              data-testid="notifications-filter-all"
              className={cn('text-xs px-3 py-1 rounded-md transition-colors', filter === 'all' ? 'bg-white shadow-sm font-medium' : 'text-gray-500')}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              data-testid="notifications-filter-unread"
              className={cn('text-xs px-3 py-1 rounded-md transition-colors', filter === 'unread' ? 'bg-white shadow-sm font-medium' : 'text-gray-500')}
            >
              Unread
            </button>
          </div>
          <button
            onClick={handleMarkAllRead}
            data-testid="notifications-mark-all-btn"
            className="flex items-center gap-1 text-sm text-brand-600 hover:underline"
          >
            <Check size={14} /> Mark all read
          </button>
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">{filter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const Icon = iconMap[n.type] || Bell
            const color = colorMap[n.type] || 'bg-gray-100 text-gray-600'
            const link = getNotificationLink(n)
            const nid = tid(n.id)

            const content = (
              <div
                data-testid={`notification-${nid}`}
                className={cn(
                  'card flex items-start gap-3 cursor-pointer transition-colors',
                  !n.is_read && 'bg-brand-50/50 border-brand-100',
                  'hover:bg-gray-50'
                )}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', color)}>
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {n.actor ? (
                      <Link to={`/profile/${n.actor.username}`} className="font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                        {n.actor.display_name}
                      </Link>
                    ) : (
                      <span className="font-semibold">Someone</span>
                    )}
                    {' '}{textMap[n.type] || n.type}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}
                    data-testid={`notification-mark-read-btn-${nid}`}
                    className="w-2.5 h-2.5 rounded-full bg-brand-600 shrink-0 mt-2 hover:bg-brand-700"
                    title="Mark as read"
                  />
                )}
              </div>
            )

            return link ? (
              <Link key={n.id} to={link} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
