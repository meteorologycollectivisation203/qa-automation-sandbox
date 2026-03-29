import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, ArrowLeft } from 'lucide-react'
import { messagesApi } from '../../api/messages'
import { useAuth } from '../../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { cn, tid } from '../../lib/utils'
import type { Conversation, Message } from '../../types'

export default function ConversationPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [convRes, msgsRes] = await Promise.all([
        messagesApi.getConversation(id),
        messagesApi.listMessages(id, { per_page: 50 }),
      ])
      setConversation(convRes.data)
      setMessages(msgsRes.data.items.reverse())
      await messagesApi.markRead(id)
      window.dispatchEvent(new Event('badges:refresh'))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async () => {
    if (!id || !newMessage.trim() || sending) return
    setSending(true)
    try {
      await messagesApi.sendMessage(id, { content: newMessage.trim() })
      setNewMessage('')
      load()
    } catch { /* ignore */ }
    finally { setSending(false) }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>
  if (!conversation) return <div className="text-center py-8 text-gray-500">Conversation not found</div>

  const otherParticipants = conversation.participants.filter((p) => p.id !== user?.id)
  const title = conversation.is_group
    ? conversation.name || otherParticipants.map((p) => p.display_name).join(', ')
    : otherParticipants[0]?.display_name || 'Unknown'
  const subtitle = conversation.is_group
    ? `${conversation.participants.length} participants`
    : `@${otherParticipants[0]?.username || 'unknown'}`

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-3 mb-3">
        <Link to="/messages" className="text-gray-400 hover:text-gray-600 lg:hidden">
          <ArrowLeft size={20} />
        </Link>
        {!conversation.is_group && otherParticipants[0] ? (
          <Link to={`/profile/${otherParticipants[0].username}`} className="flex items-center gap-3 hover:opacity-80">
            <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
              {otherParticipants[0].display_name[0]}
            </div>
            <div>
              <h1 className="text-lg font-bold">{title}</h1>
              <p className="text-xs text-gray-400">{subtitle}</p>
            </div>
          </Link>
        ) : (
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-gray-400">{subtitle}</p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-3 px-1">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">
            No messages yet. Say hello!
          </div>
        )}
        {messages.map((msg) => {
          const isOwn = msg.sender?.id === user?.id
          const mid = tid(msg.id)
          return (
            <div
              key={msg.id}
              data-testid={`message-${mid}`}
              className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}
            >
              {!isOwn && msg.sender && (
                <Link to={`/profile/${msg.sender.username}`} className="shrink-0 mr-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold">
                    {msg.sender.display_name[0]}
                  </div>
                </Link>
              )}
              <div
                className={cn(
                  'max-w-[75%] rounded-2xl px-4 py-2 text-sm',
                  isOwn ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900'
                )}
              >
                {!isOwn && msg.sender && conversation.is_group && (
                  <p className="text-xs font-medium opacity-70 mb-0.5">{msg.sender.display_name}</p>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/60' : 'text-gray-400')}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-gray-200 pt-3">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          data-testid="message-input"
          className="input-field flex-1"
          maxLength={2000}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          data-testid="message-send-btn"
          className="btn-primary px-4"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
