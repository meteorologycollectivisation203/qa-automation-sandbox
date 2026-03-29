import { useEffect, useState } from 'react'
import { adminApi } from '../../api/admin'
import { tid } from '../../lib/utils'
import type { User } from '../../types'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const res = await adminApi.listUsers({ search: search || undefined, per_page: 50 } as any)
      setUsers(res.data.items)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await adminApi.updateUser(userId, { role })
      toast.success('Role updated')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      await adminApi.updateUser(userId, { is_active: isActive })
      toast.success(isActive ? 'User activated' : 'User banned')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  const handleToggleVerified = async (userId: string, isVerified: boolean) => {
    try {
      await adminApi.updateUser(userId, { is_verified: isVerified })
      toast.success(isVerified ? 'User verified' : 'Verification removed')
      load()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed')
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-400">Loading...</div>

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">User Management</h1>

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search users..."
          data-testid="admin-search-input"
          className="input-field"
        />
      </div>

      <div className="space-y-2" data-testid="admin-users-table">
        {users.map((u) => {
          const uid = tid(u.id)
          return (
            <div key={u.id} className="card" data-testid={`admin-user-row-${uid}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-sm">
                    {u.display_name}
                    {u.is_verified && <span className="text-brand-500 ml-1">✓</span>}
                    {!u.is_active && <span className="text-red-500 ml-1">[BANNED]</span>}
                  </p>
                  <p className="text-xs text-gray-500">@{u.username} · {u.email} · {u.role}</p>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    data-testid={`admin-role-select-${uid}`}
                    className="text-xs border border-gray-200 rounded px-2 py-1"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button
                    onClick={() => handleToggleVerified(u.id, !u.is_verified)}
                    data-testid={`admin-verify-btn-${uid}`}
                    className={`text-xs px-2 py-1 rounded ${u.is_verified ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600'}`}
                  >
                    {u.is_verified ? 'Verified' : 'Verify'}
                  </button>

                  <button
                    onClick={() => handleToggleActive(u.id, !u.is_active)}
                    data-testid={`admin-ban-btn-${uid}`}
                    className={`text-xs px-2 py-1 rounded ${u.is_active ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                  >
                    {u.is_active ? 'Ban' : 'Unban'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
