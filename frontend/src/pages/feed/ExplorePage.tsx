import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { postsApi } from '../../api/posts'
import { searchApi } from '../../api/search'
import PostCard from '../../components/post/PostCard'
import type { Hashtag, Post } from '../../types'

export default function ExplorePage() {
  const [searchParams] = useSearchParams()
  const hashtagFilter = searchParams.get('hashtag')
  const [posts, setPosts] = useState<Post[]>([])
  const [trending, setTrending] = useState<Hashtag[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [postsRes, trendingRes] = await Promise.all([
        postsApi.list({ hashtag: hashtagFilter || undefined, sort_by: 'likes_count', sort_order: 'desc' }),
        searchApi.trending({ limit: 10 }),
      ])
      setPosts(postsRes.data.items)
      setTrending(trendingRes.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [hashtagFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        {hashtagFilter ? `#${hashtagFilter}` : 'Explore'}
      </h1>

      {trending.length > 0 && !hashtagFilter && (
        <div className="card mb-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-2">Trending</h2>
          <div className="flex flex-wrap gap-2">
            {trending.map((tag) => (
              <a
                key={tag.id}
                href={`/explore?hashtag=${tag.name}`}
                className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full hover:bg-brand-100"
              >
                #{tag.name} <span className="text-gray-400">({tag.posts_count})</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No posts found</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} onUpdate={load} />)
      )}
    </div>
  )
}
