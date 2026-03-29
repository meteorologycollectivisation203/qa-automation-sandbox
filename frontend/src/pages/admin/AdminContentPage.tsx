import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import type { Post } from '../../types'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

export default function AdminContentPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeleted, setShowDeleted] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.listPosts({ is_deleted: showDeleted || undefined } as any)
      setPosts(res.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [showDeleted])

  const handleDelete = async (postId: string) => {
    const reason = prompt('Reason for deletion:')
    if (reason === null) return
    try {
      await adminApi.deletePost(postId, reason || undefined)
      toast.success('Post deleted')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Content Moderation</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setShowDeleted(false)}
          className={showDeleted ? 'btn-secondary text-sm' : 'btn-primary text-sm'}
        >
          Active posts
        </button>
        <button
          onClick={() => setShowDeleted(true)}
          className={showDeleted ? 'btn-primary text-sm' : 'btn-secondary text-sm'}
        >
          Deleted posts
        </button>
      </div>

      <div className="space-y-2" data-testid="admin-posts-table">
        {posts.map((post) => (
          <div key={post.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400">
                  @{post.author.username} · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  {post.is_deleted && <span className="text-red-500 ml-1">[DELETED]</span>}
                </p>
                <p className="text-sm mt-1 truncate">{post.content}</p>
                <p className="text-xs text-gray-400 mt-1">
                  ❤️ {post.likes_count} · 💬 {post.comments_count} · 🔄 {post.reposts_count}
                </p>
              </div>
              {!post.is_deleted && (
                <button
                  onClick={() => handleDelete(post.id)}
                  data-testid={`admin-delete-post-btn-${post.id}`}
                  className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded shrink-0"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <p className="text-center py-6 text-gray-400 text-sm">No posts</p>
        )}
      </div>
    </div>
  )
}
