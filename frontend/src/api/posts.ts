import client from './client'
import type { PaginatedResponse, Post } from '../types'

export const postsApi = {
  list: (params?: { hashtag?: string; page?: number; per_page?: number; sort_by?: string; sort_order?: string }) =>
    client.get<PaginatedResponse<Post>>('/posts', { params }),

  feed: (params?: { page?: number; per_page?: number }) =>
    client.get<PaginatedResponse<Post>>('/posts/feed', { params }),

  get: (id: string) => client.get<Post>(`/posts/${id}`),

  create: (data: { content: string; image_url?: string; visibility?: string }) =>
    client.post<Post>('/posts', data),

  update: (id: string, data: { content: string }) =>
    client.patch<Post>(`/posts/${id}`, data),

  delete: (id: string, reason?: string) =>
    client.delete(`/posts/${id}`, { params: { reason } }),

  repost: (id: string, data: { repost_type: string; content?: string }) =>
    client.post<Post>(`/posts/${id}/repost`, data),

  pin: (id: string) => client.post(`/posts/${id}/pin`),
  unpin: (id: string) => client.delete(`/posts/${id}/pin`),

  like: (id: string, reaction: string = 'like') =>
    client.post(`/posts/${id}/like`, { reaction }),

  unlike: (id: string) => client.delete(`/posts/${id}/like`),

  bookmark: (id: string) => client.post(`/posts/${id}/bookmark`),
  unbookmark: (id: string) => client.delete(`/posts/${id}/bookmark`),

  getLikes: (id: string, params?: { page?: number }) =>
    client.get(`/posts/${id}/likes`, { params }),
}
