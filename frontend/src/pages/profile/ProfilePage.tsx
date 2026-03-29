import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Calendar, Lock, CheckCircle, MessageCircle, UserCheck } from 'lucide-react'
import { format } from 'date-fns'
import { usersApi } from '../../api/users'
import { messagesApi } from '../../api/messages'
import { useAuth } from '../../context/AuthContext'
import PostCard from '../../components/post/PostCard'
import type { Post, User } from '../../types'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!username) return
    setLoading(true)
    try {
      const [userRes, postsRes] = await Promise.all([
        usersApi.get(username),
        usersApi.getPosts(username),
      ])
      setProfile(userRes.data)
      setPosts(postsRes.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [username])

  useEffect(() => { load() }, [load])

  const handleFollow = async () => {
    if (!username || !profile) return
    try {
      if (profile.is_following) {
        await usersApi.unfollow(username)
        toast.success('Unfollowed')
      } else {
        await usersApi.follow(username)
        toast.success(profile.is_private ? 'Follow request sent' : 'Following!')
      }
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const handleMessage = async () => {
    if (!username) return
    try {
      const res = await messagesApi.findOrCreateDm(username)
      navigate(`/messages/${res.data.id}`)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>
  if (!profile) return <div className="text-center py-8 text-gray-500">User not found</div>

  const isOwnProfile = currentUser?.id === profile.id

  return (
    <div>
      <div className="card mb-4">
        <div className="flex items-start gap-4">
          <div
            className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-2xl font-bold shrink-0"
            data-testid="profile-avatar"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              profile.display_name[0]
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold" data-testid="profile-display-name">
                {profile.display_name}
              </h1>
              {profile.is_verified && (
                <CheckCircle size={18} className="text-brand-500" />
              )}
              {profile.is_private && (
                <Lock size={16} className="text-gray-400" />
              )}
              {!isOwnProfile && profile.is_followed_by && (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Follows you</span>
              )}
            </div>
            <p className="text-gray-500 text-sm" data-testid="profile-username">@{profile.username}</p>
            <p className="text-xs text-gray-400" data-testid="profile-role">Role: {profile.role}</p>

            {profile.bio && (
              <p className="text-sm mt-2 whitespace-pre-wrap" data-testid="profile-bio">{profile.bio}</p>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
              <Calendar size={12} />
              <span>Joined {format(new Date(profile.created_at), 'MMMM yyyy')}</span>
            </div>

            <div className="flex gap-4 mt-3 text-sm">
              <Link to={`/profile/${profile.username}/following`} className="hover:underline">
                <span className="font-bold" data-testid="profile-following-count">{profile.following_count}</span>
                <span className="text-gray-500 ml-1">Following</span>
              </Link>
              <Link to={`/profile/${profile.username}/followers`} className="hover:underline">
                <span className="font-bold" data-testid="profile-followers-count">{profile.followers_count}</span>
                <span className="text-gray-500 ml-1">Followers</span>
              </Link>
              <span>
                <span className="font-bold" data-testid="profile-posts-count">{profile.posts_count}</span>
                <span className="text-gray-500 ml-1">Posts</span>
              </span>
            </div>

            <div className="flex gap-2 mt-3">
              {!isOwnProfile && (
                <>
                  <button
                    onClick={handleFollow}
                    data-testid="profile-follow-btn"
                    className={profile.is_following ? 'btn-secondary' : 'btn-primary'}
                  >
                    {profile.is_following ? 'Unfollow' : profile.is_private ? 'Request to Follow' : 'Follow'}
                  </button>
                  <button
                    onClick={handleMessage}
                    data-testid="profile-message-btn"
                    className="btn-outline flex items-center gap-1.5"
                  >
                    <MessageCircle size={16} /> Message
                  </button>
                </>
              )}
              {isOwnProfile && (
                <Link to="/settings" data-testid="profile-edit-btn" className="btn-secondary inline-block">
                  Edit profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-3">Posts</h2>
      {posts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No posts yet</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} onUpdate={load} />)
      )}
    </div>
  )
}
