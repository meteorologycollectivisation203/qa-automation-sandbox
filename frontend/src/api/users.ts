import client from './client'
import type { PaginatedResponse, Post, User, UserBrief } from '../types'

export const usersApi = {
  list: (params?: { search?: string; page?: number; per_page?: number }) =>
    client.get<PaginatedResponse<UserBrief>>('/users', { params }),

  get: (username: string) => client.get<User>(`/users/${username}`),

  updateMe: (data: { display_name?: string; bio?: string; is_private?: boolean }) =>
    client.patch<User>('/users/me', data),

  uploadAvatar: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return client.post<User>('/users/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteAvatar: () => client.delete('/users/me/avatar'),

  getPosts: (username: string, params?: { page?: number }) =>
    client.get<PaginatedResponse<Post>>(`/users/${username}/posts`, { params }),

  getFollowers: (username: string, params?: { page?: number }) =>
    client.get<PaginatedResponse<UserBrief>>(`/users/${username}/followers`, { params }),

  getFollowing: (username: string, params?: { page?: number }) =>
    client.get<PaginatedResponse<UserBrief>>(`/users/${username}/following`, { params }),

  follow: (username: string) => client.post(`/users/${username}/follow`),
  unfollow: (username: string) => client.delete(`/users/${username}/follow`),
}
