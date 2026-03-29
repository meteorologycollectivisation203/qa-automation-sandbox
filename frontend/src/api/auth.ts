import client from './client'
import type { TokenResponse, User } from '../types'

export const authApi = {
  register: (data: { email: string; username: string; password: string; display_name: string }) =>
    client.post<User>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    client.post<TokenResponse>('/auth/login', data),

  refresh: (refresh_token: string) =>
    client.post<TokenResponse>('/auth/refresh', { refresh_token }),

  logout: (refresh_token: string) =>
    client.post('/auth/logout', { refresh_token }),

  getMe: () => client.get<User>('/auth/me'),
}
