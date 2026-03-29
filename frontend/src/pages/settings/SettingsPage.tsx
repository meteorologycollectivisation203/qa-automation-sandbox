import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { usersApi } from '../../api/users'
import client from '../../api/client'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [isPrivate, setIsPrivate] = useState(user?.is_private || false)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await usersApi.updateMe({ display_name: displayName, bio, is_private: isPrivate })
      await refreshUser()
      toast.success('Profile updated!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally { setSaving(false) }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await usersApi.uploadAvatar(file)
      await refreshUser()
      toast.success('Avatar updated!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    }
  }

  const handleReset = async () => {
    if (!confirm('This will reset the ENTIRE database to its initial state.\n\nAll your changes, posts, messages will be lost.\n\nAre you sure?')) return
    setResetting(true)
    try {
      await client.post('/reset')
      toast.success('Database reset! Logging out...')
      setTimeout(() => logout(), 1500)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Reset failed')
    } finally { setResetting(false) }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Settings</h1>

      <div className="card space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                user?.display_name[0]
              )}
            </div>
            <label className="btn-secondary cursor-pointer text-sm">
              Change avatar
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-field"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-400 mt-1">{bio.length}/500</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="private"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="rounded border-gray-300"
          />
          <label htmlFor="private" className="text-sm">Private account (follow requests required)</label>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="card mt-4">
        <h2 className="font-semibold mb-2">Account info</h2>
        <div className="text-sm space-y-1 text-gray-600">
          <p>Username: <span className="font-mono">@{user?.username}</span></p>
          <p>Email: <span className="font-mono">{user?.email}</span></p>
          <p>Role: <span className="font-mono">{user?.role}</span></p>
          <p>User ID: <span className="font-mono text-xs">{user?.id}</span></p>
        </div>
      </div>

      {/* Reset Database */}
      <div className="card mt-4 border-red-200 bg-red-50/50">
        <h2 className="font-semibold mb-2 text-red-700 flex items-center gap-2">
          <RotateCcw size={18} />
          Reset Sandbox
        </h2>
        <p className="text-sm text-red-600 mb-3">
          Reset the entire database to its default state. All posts, comments, messages, and user changes will be lost.
          The 8 test accounts and seed data will be restored.
        </p>
        <button
          onClick={handleReset}
          disabled={resetting}
          data-testid="reset-database-btn"
          className="btn-danger flex items-center gap-2"
        >
          <RotateCcw size={16} className={resetting ? 'animate-spin' : ''} />
          {resetting ? 'Resetting...' : 'Reset Database'}
        </button>
      </div>
    </div>
  )
}
