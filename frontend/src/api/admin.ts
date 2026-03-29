import client from './client'
import type { AdminStats, PaginatedResponse, Post, User } from '../types'

export const adminApi = {
  getStats: () => client.get<AdminStats>('/admin/stats'),

  listUsers: (params?: { search?: string; role?: string; is_active?: boolean; page?: number }) =>
    client.get<PaginatedResponse<User>>('/admin/users', { params }),

  updateUser: (userId: string, data: { role?: string; is_active?: boolean; is_verified?: boolean }) =>
    client.patch<User>(`/admin/users/${userId}`, data),

  deactivateUser: (userId: string) =>
    client.delete(`/admin/users/${userId}`),

  listPosts: (params?: { is_deleted?: boolean; page?: number }) =>
    client.get<PaginatedResponse<Post>>('/admin/posts', { params }),

  deletePost: (postId: string, reason?: string) =>
    client.delete(`/admin/posts/${postId}`, { params: { reason } }),
}
