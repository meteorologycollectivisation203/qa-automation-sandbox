import { useEffect, useState } from 'react'
import { Bookmark } from 'lucide-react'
import PostCard from '../../components/post/PostCard'
import type { Post } from '../../types'
import client from '../../api/client'

export default function BookmarksPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const res = await client.get('/bookmarks')
      setPosts(res.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Bookmarks</h1>
      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No bookmarks yet</p>
          <p className="text-gray-400 text-sm mt-1">Save posts to read later</p>
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} onUpdate={load} />)
      )}
    </div>
  )
}
