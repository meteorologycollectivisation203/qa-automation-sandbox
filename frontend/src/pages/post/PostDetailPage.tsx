import { useCallback, useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { postsApi } from '../../api/posts'
import { commentsApi } from '../../api/comments'
import PostCard from '../../components/post/PostCard'
import type { Comment, Post } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import { Heart, MessageCircle, Send, ChevronDown } from 'lucide-react'
import { cn, tid } from '../../lib/utils'
import toast from 'react-hot-toast'

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, Comment[]>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [postRes, commentsRes] = await Promise.all([
        postsApi.get(id),
        commentsApi.list(id),
      ])
      setPost(postRes.data)
      setComments(commentsRes.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { load() }, [load])

  const handleComment = async () => {
    if (!id || !newComment.trim()) return
    setSubmitting(true)
    try {
      if (replyTo) {
        await commentsApi.reply(replyTo.id, { content: newComment.trim() })
        toast.success('Reply added!')
        // Refresh replies for that comment
        const res = await commentsApi.getReplies(replyTo.id)
        setExpandedReplies((prev) => ({ ...prev, [replyTo.id]: res.data.items }))
      } else {
        await commentsApi.create(id, { content: newComment.trim() })
        toast.success('Comment added!')
      }
      setNewComment('')
      setReplyTo(null)
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    } finally { setSubmitting(false) }
  }

  const handleLikeComment = async (comment: Comment) => {
    try {
      if (comment.is_liked) {
        await commentsApi.unlike(comment.id)
      } else {
        await commentsApi.like(comment.id)
      }
      load()
    } catch { /* ignore */ }
  }

  const handleLoadReplies = async (commentId: string) => {
    try {
      const res = await commentsApi.getReplies(commentId)
      setExpandedReplies((prev) => ({ ...prev, [commentId]: res.data.items }))
    } catch { /* ignore */ }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>
  if (!post) return <div className="text-center py-8 text-gray-500">Post not found</div>

  const renderComment = (comment: Comment, depth: number = 0) => {
    const cid = tid(comment.id)
    const replies = expandedReplies[comment.id] || []
    return (
      <div key={comment.id} className={cn(depth > 0 && 'ml-8 border-l-2 border-gray-100 pl-3')}>
        <div className="card mb-2" data-testid={`comment-${cid}`}>
          <div className="flex items-start gap-3">
            <Link to={`/profile/${comment.author.username}`}>
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                {comment.author.display_name[0]}
              </div>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <Link to={`/profile/${comment.author.username}`} className="font-semibold hover:underline">
                  {comment.author.display_name}
                </Link>
                <span className="text-gray-400">@{comment.author.username}</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-400 text-xs">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => handleLikeComment(comment)}
                  data-testid={`comment-like-btn-${cid}`}
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    comment.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                  )}
                >
                  <Heart size={14} fill={comment.is_liked ? 'currentColor' : 'none'} />
                  {comment.likes_count}
                </button>
                <button
                  onClick={() => setReplyTo(comment)}
                  data-testid={`comment-reply-btn-${cid}`}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-600"
                >
                  <MessageCircle size={14} /> Reply
                </button>
                {comment.replies_count > 0 && !expandedReplies[comment.id] && (
                  <button
                    onClick={() => handleLoadReplies(comment.id)}
                    className="flex items-center gap-1 text-xs text-brand-600 hover:underline"
                  >
                    <ChevronDown size={14} /> {comment.replies_count} replies
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    )
  }

  return (
    <div>
      <PostCard post={post} onUpdate={load} />

      <div className="card mb-3">
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
            <span>Replying to <b>@{replyTo.author.username}</b></span>
            <button onClick={() => setReplyTo(null)} className="text-red-500 hover:underline">Cancel</button>
          </div>
        )}
        <div className="flex gap-3">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={replyTo ? `Reply to @${replyTo.author.username}...` : 'Write a comment...'}
            data-testid="comment-input"
            maxLength={1000}
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim() || submitting}
            data-testid="comment-submit-btn"
            className="btn-primary self-end px-3 py-2"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        {comments.map((comment) => renderComment(comment))}
        {comments.length === 0 && (
          <div className="text-center py-6 text-gray-400 text-sm">No comments yet</div>
        )}
      </div>
    </div>
  )
}
