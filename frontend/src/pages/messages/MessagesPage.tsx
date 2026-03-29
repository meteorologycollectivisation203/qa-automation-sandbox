import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageCircle, Search, X } from 'lucide-react'
import { messagesApi } from '../../api/messages'
import { searchApi } from '../../api/search'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '../../context/AuthContext'
import { tid } from '../../lib/utils'
import type { Conversation, UserBrief } from '../../types'
import toast from 'react-hot-toast'

export default function MessagesPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserBrief[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    messagesApi.listConversations()
      .then((res) => setConversations(res.data.items))
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const res = await searchApi.users({ q: searchQuery })
      setSearchResults(res.data.items.filter((u) => u.id !== user?.id))
    } catch { /* ignore */ }
    finally { setSearching(false) }
  }

  const handleStartDm = async (username: string) => {
    try {
      const res = await messagesApi.findOrCreateDm(username)
      setShowNewChat(false)
      navigate(`/messages/${res.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to start conversation')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Messages</h1>
        <button
          onClick={() => setShowNewChat(true)}
          data-testid="new-conversation-btn"
          className="btn-primary text-sm px-3 py-1.5"
        >
          New message
        </button>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="card mb-4 border-brand-200" data-testid="new-conversation-modal">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Start a conversation</h3>
            <button onClick={() => setShowNewChat(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search users..."
                data-testid="new-conversation-search"
                className="input-field pl-8 text-sm"
                autoFocus
              />
            </div>
            <button onClick={handleSearch} className="btn-secondary text-sm" disabled={searching}>
              Search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleStartDm(u.username)}
                  data-testid={`new-conversation-user-${tid(u.id)}`}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold">
                    {u.display_name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.display_name}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {conversations.length === 0 ? (
        <div className="text-center py-12">
          <MessageCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No conversations yet</p>
          <p className="text-gray-400 text-sm mt-1">Start a conversation with someone!</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((conv) => {
            const cid = tid(conv.id)
            const otherParticipants = conv.participants.filter((p) => p.id !== user?.id)
            const displayName = conv.is_group
              ? conv.name || otherParticipants.map((p) => p.display_name).join(', ')
              : otherParticipants[0]?.display_name || 'Unknown'

            return (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                data-testid={`conversation-${cid}`}
                className="card flex items-center gap-3 hover:bg-gray-50"
              >
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold shrink-0">
                  {conv.is_group ? '👥' : displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    {conv.last_message && (
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  {conv.last_message && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {conv.last_message.content}
                    </p>
                  )}
                </div>
                {conv.unread_count > 0 && (
                  <span className="bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unread_count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
