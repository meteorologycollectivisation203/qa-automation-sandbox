import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, Repeat2, Bookmark, Pin, MoreHorizontal, Trash2, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { postsApi } from '../../api/posts'
import { useAuth } from '../../context/AuthContext'
import type { Post } from '../../types'
import { cn, tid } from '../../lib/utils'

interface Props {
  post: Post
  onUpdate?: () => void
}

export default function PostCard({ post, onUpdate }: Props) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(post.is_liked)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [bookmarked, setBookmarked] = useState(post.is_bookmarked)
  const [showMenu, setShowMenu] = useState(false)

  const isAuthor = user?.id === post.author.id
  const isMod = user?.role === 'admin' || user?.role === 'moderator'
  const id = tid(post.id)

  const handleLike = async () => {
    try {
      if (liked) {
        await postsApi.unlike(post.id)
        setLikesCount((c) => c - 1)
      } else {
        await postsApi.like(post.id)
        setLikesCount((c) => c + 1)
      }
      setLiked(!liked)
    } catch { /* ignore */ }
  }

  const handleBookmark = async () => {
    try {
      if (bookmarked) {
        await postsApi.unbookmark(post.id)
      } else {
        await postsApi.bookmark(post.id)
      }
      setBookmarked(!bookmarked)
    } catch { /* ignore */ }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    try {
      await postsApi.delete(post.id)
      onUpdate?.()
    } catch { /* ignore */ }
  }

  const renderContent = (text: string) => {
    return text.split(/(#\w+)/g).map((part, i) => {
      if (part.startsWith('#')) {
        return (
          <Link
            key={i}
            to={`/explore?hashtag=${part.slice(1)}`}
            className="text-brand-600 hover:underline"
          >
            {part}
          </Link>
        )
      }
      return part
    })
  }

  return (
    <article className="card mb-3" data-testid={`post-card-${id}`}>
      {post.is_pinned && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Pin size={12} />
          <span>Pinned post</span>
        </div>
      )}

      {post.repost_type && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
          <Repeat2 size={12} />
          <span>{post.repost_type === 'repost' ? 'Reposted' : 'Quoted'}</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <Link to={`/profile/${post.author.username}`} data-testid={`post-author-${id}`}>
          <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
            {post.author.avatar_url ? (
              <img src={post.author.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              post.author.display_name[0]
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/profile/${post.author.username}`} className="font-semibold text-sm hover:underline">
              {post.author.display_name}
            </Link>
            {post.author.is_verified && <span className="text-brand-500 text-xs">✓</span>}
            <span className="text-gray-500 text-xs">@{post.author.username}</span>
            <span className="text-gray-400 text-xs">·</span>
            <Link
              to={`/post/${post.id}`}
              className="text-gray-500 text-xs hover:underline"
            >
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </Link>

            {(isAuthor || isMod) && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  data-testid={`post-menu-btn-${id}`}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <MoreHorizontal size={16} className="text-gray-400" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border z-10">
                    {isAuthor && (
                      <Link
                        to={`/post/${post.id}`}
                        data-testid={`post-edit-btn-${id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full"
                      >
                        <Edit size={14} /> Edit
                      </Link>
                    )}
                    <button
                      onClick={handleDelete}
                      data-testid={`post-delete-btn-${id}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-1 text-sm whitespace-pre-wrap break-words" data-testid={`post-content-${id}`}>
            {renderContent(post.content)}
          </div>

          {post.image_url && (
            <img
              src={post.image_url}
              alt="Post image"
              className="mt-3 rounded-xl max-h-96 w-full object-cover border border-gray-100"
            />
          )}

          {post.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {post.hashtags.map((tag) => (
                <Link
                  key={tag.id}
                  to={`/explore?hashtag=${tag.name}`}
                  className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full hover:bg-brand-100"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 mt-3 -ml-2">
            <button
              onClick={handleLike}
              data-testid={`post-like-btn-${id}`}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors',
                liked ? 'text-red-500 bg-red-50' : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
              )}
            >
              <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
              <span data-testid={`post-likes-count-${id}`}>{likesCount}</span>
            </button>

            <Link
              to={`/post/${post.id}`}
              data-testid={`post-comment-btn-${id}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm text-gray-500 hover:text-brand-600 hover:bg-brand-50"
            >
              <MessageCircle size={16} />
              <span data-testid={`post-comments-count-${id}`}>{post.comments_count}</span>
            </Link>

            <button
              data-testid={`post-repost-btn-${id}`}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm text-gray-500 hover:text-green-600 hover:bg-green-50"
            >
              <Repeat2 size={16} />
              <span>{post.reposts_count}</span>
            </button>

            <button
              onClick={handleBookmark}
              data-testid={`post-bookmark-btn-${id}`}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors ml-auto',
                bookmarked ? 'text-brand-600 bg-brand-50' : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50'
              )}
            >
              <Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
      </div>
    </article>
  )
}
