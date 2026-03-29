import client from './client'
import type { Notification, PaginatedResponse } from '../types'

export const notificationsApi = {
  list: (params?: { is_read?: boolean; page?: number }) =>
    client.get<PaginatedResponse<Notification>>('/notifications', { params }),

  getUnreadCount: () =>
    client.get<{ count: number }>('/notifications/unread-count'),

  markRead: (id: string) =>
    client.post(`/notifications/${id}/read`),

  markAllRead: () =>
    client.post('/notifications/read-all'),
}
