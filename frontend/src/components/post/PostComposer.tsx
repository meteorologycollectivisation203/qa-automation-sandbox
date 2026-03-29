import { useRef, useState } from 'react'
import { Image, Send, X } from 'lucide-react'
import { postsApi } from '../../api/posts'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'
import toast from 'react-hot-toast'

interface Props {
  onCreated?: () => void
}

export default function PostComposer({ onCreated }: Props) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await client.post('/upload/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setImageUrl(res.data.url)
      toast.success('Image uploaded!')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!content.trim()) return
    setLoading(true)
    try {
      await postsApi.create({
        content: content.trim(),
        image_url: imageUrl || undefined,
      })
      setContent('')
      setImageUrl(null)
      toast.success('Post created!')
      onCreated?.()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card mb-4" data-testid="post-composer">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
          {user?.display_name[0]}
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's buzzing?"
            data-testid="post-composer-input"
            maxLength={2000}
            rows={3}
            className="w-full resize-none border-0 focus:outline-none text-sm placeholder-gray-400"
          />

          {imageUrl && (
            <div className="relative mt-2 inline-block" data-testid="post-composer-image-preview">
              <img src={imageUrl} alt="Attached" className="max-h-40 rounded-lg border border-gray-200" />
              <button
                onClick={() => setImageUrl(null)}
                data-testid="post-composer-image-remove"
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2">
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                data-testid="post-composer-file-input"
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                data-testid="post-composer-image-btn"
                className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg disabled:opacity-50"
              >
                <Image size={18} />
              </button>
              {uploading && <span className="text-xs text-gray-400 self-center">Uploading...</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{content.length}/2000</span>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || loading}
                data-testid="post-composer-submit"
                className="btn-primary text-sm px-4 py-1.5 flex items-center gap-1.5"
              >
                <Send size={14} />
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
