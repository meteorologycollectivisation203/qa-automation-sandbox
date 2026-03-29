export interface UserBrief {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  is_verified: boolean
}

export interface User extends UserBrief {
  email: string
  bio: string | null
  cover_url: string | null
  role: string
  is_active: boolean
  is_private: boolean
  created_at: string
  updated_at: string
  followers_count: number
  following_count: number
  posts_count: number
  is_following: boolean
  is_followed_by: boolean
}

export interface Post {
  id: string
  author: UserBrief
  content: string
  image_url: string | null
  is_pinned: boolean
  is_deleted: boolean
  parent_id: string | null
  repost_type: string | null
  visibility: string
  likes_count: number
  comments_count: number
  reposts_count: number
  hashtags: Hashtag[]
  created_at: string
  updated_at: string
  is_liked: boolean
  is_bookmarked: boolean
  user_reaction: string | null
}

export interface Comment {
  id: string
  post_id: string
  author: UserBrief
  content: string
  parent_comment_id: string | null
  is_deleted: boolean
  likes_count: number
  created_at: string
  updated_at: string
  is_liked: boolean
  replies_count: number
}

export interface Hashtag {
  id: string
  name: string
  posts_count: number
}

export interface Like {
  id: string
  user: UserBrief
  reaction: string
  created_at: string
}

export interface Follow {
  id: string
  follower: UserBrief
  following: UserBrief
  status: string
  created_at: string
}

export interface Conversation {
  id: string
  is_group: boolean
  name: string | null
  participants: UserBrief[]
  last_message: Message | null
  unread_count: number
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender: UserBrief | null
  content: string
  image_url: string | null
  is_deleted: boolean
  created_at: string
}

export interface Notification {
  id: string
  actor: UserBrief | null
  type: string
  target_type: string | null
  target_id: string | null
  is_read: boolean
  created_at: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AdminStats {
  total_users: number
  active_users: number
  total_posts: number
  total_comments: number
  total_conversations: number
  total_messages: number
}
