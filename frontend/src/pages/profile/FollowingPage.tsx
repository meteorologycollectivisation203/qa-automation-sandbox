import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usersApi } from '../../api/users'
import type { UserBrief } from '../../types'

export default function FollowingPage() {
  const { username } = useParams<{ username: string }>()
  const [users, setUsers] = useState<UserBrief[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    usersApi.getFollowing(username)
      .then((res) => setUsers(res.data.items))
      .finally(() => setLoading(false))
  }, [username])

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        <Link to={`/profile/${username}`} className="text-brand-600 hover:underline">@{username}</Link>
        {' '} — Following
      </h1>
      {users.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Not following anyone</p>
      ) : (
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
        </div>
      )}
    </div>
  )
}
