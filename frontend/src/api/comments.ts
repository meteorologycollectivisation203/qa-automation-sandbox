import client from './client'
import type { Comment, PaginatedResponse } from '../types'

export const commentsApi = {
  list: (postId: string, params?: { page?: number; sort_by?: string }) =>
    client.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`, { params }),

  create: (postId: string, data: { content: string }) =>
    client.post<Comment>(`/posts/${postId}/comments`, data),

  update: (commentId: string, data: { content: string }) =>
    client.patch<Comment>(`/comments/${commentId}`, data),

  delete: (commentId: string) => client.delete(`/comments/${commentId}`),

  getReplies: (commentId: string, params?: { page?: number }) =>
    client.get<PaginatedResponse<Comment>>(`/comments/${commentId}/replies`, { params }),

  reply: (commentId: string, data: { content: string }) =>
    client.post<Comment>(`/comments/${commentId}/replies`, data),

  like: (commentId: string, reaction: string = 'like') =>
    client.post(`/comments/${commentId}/like`, { reaction }),

  unlike: (commentId: string) => client.delete(`/comments/${commentId}/like`),
}
