import client from './client'
import type { Conversation, Message, PaginatedResponse } from '../types'

export const messagesApi = {
  listConversations: (params?: { page?: number }) =>
    client.get<PaginatedResponse<Conversation>>('/conversations', { params }),

  createConversation: (data: { participant_ids: string[]; is_group?: boolean; name?: string }) =>
    client.post<Conversation>('/conversations', data),

  findOrCreateDm: (username: string) =>
    client.post<Conversation>(`/conversations/dm/${username}`),

  getConversation: (id: string) =>
    client.get<Conversation>(`/conversations/${id}`),

  listMessages: (conversationId: string, params?: { page?: number; per_page?: number }) =>
    client.get<PaginatedResponse<Message>>(`/conversations/${conversationId}/messages`, { params }),

  sendMessage: (conversationId: string, data: { content: string; image_url?: string }) =>
    client.post<Message>(`/conversations/${conversationId}/messages`, data),

  deleteMessage: (messageId: string) =>
    client.delete(`/messages/${messageId}`),

  markRead: (conversationId: string) =>
    client.post(`/conversations/${conversationId}/read`),
}
