import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'
import { searchApi } from '../../api/search'
import PostCard from '../../components/post/PostCard'
import type { Post, UserBrief, Hashtag } from '../../types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'users' | 'posts' | 'hashtags'>('users')
  const [users, setUsers] = useState<UserBrief[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [hashtags, setHashtags] = useState<Hashtag[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    try {
      const [usersRes, postsRes, hashtagsRes] = await Promise.all([
        searchApi.users({ q: query }),
        searchApi.posts({ q: query }),
        searchApi.hashtags({ q: query }),
      ])
      setUsers(usersRes.data.items)
      setPosts(postsRes.data.items)
      setHashtags(hashtagsRes.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Search</h1>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users, posts, hashtags..."
            data-testid="nav-search-input"
            className="input-field pl-9"
          />
        </div>
        <button onClick={handleSearch} className="btn-primary">Search</button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(['users', 'posts', 'hashtags'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="text-xs text-gray-400 ml-1">
              ({t === 'users' ? users.length : t === 'posts' ? posts.length : hashtags.length})
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Searching...</div>
      ) : (
        <>
          {tab === 'users' && (
            <div className="space-y-2">
              {users.map((u) => (
                <Link key={u.id} to={`/profile/${u.username}`} className="card flex items-center gap-3 hover:bg-gray-50">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                    {u.display_name[0]}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{u.display_name}</p>
                    <p className="text-xs text-gray-500">@{u.username}</p>
                  </div>
                </Link>
              ))}
              {users.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No users found</p>}
            </div>
          )}

          {tab === 'posts' && (
            <div>
              {posts.map((p) => <PostCard key={p.id} post={p} />)}
              {posts.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No posts found</p>}
            </div>
          )}

          {tab === 'hashtags' && (
            <div className="space-y-2">
              {hashtags.map((h) => (
                <Link key={h.id} to={`/explore?hashtag=${h.name}`} className="card block hover:bg-gray-50">
                  <p className="font-medium text-brand-600">#{h.name}</p>
                  <p className="text-xs text-gray-400">{h.posts_count} posts</p>
                </Link>
              ))}
              {hashtags.length === 0 && <p className="text-center py-6 text-gray-400 text-sm">No hashtags found</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
