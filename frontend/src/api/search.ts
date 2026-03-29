import client from './client'
import type { Hashtag, PaginatedResponse, Post, UserBrief } from '../types'

export const searchApi = {
  users: (params: { q: string; page?: number }) =>
    client.get<PaginatedResponse<UserBrief>>('/search/users', { params }),

  posts: (params: { q: string; page?: number }) =>
    client.get<PaginatedResponse<Post>>('/search/posts', { params }),

  hashtags: (params: { q: string; page?: number }) =>
    client.get<PaginatedResponse<Hashtag>>('/search/hashtags', { params }),

  trending: (params?: { period?: string; limit?: number }) =>
    client.get<Hashtag[]>('/search/trending/hashtags', { params }),
}
