import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import AppLayout from './components/layout/AppLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import FeedPage from './pages/feed/FeedPage'
import ExplorePage from './pages/feed/ExplorePage'
import SearchPage from './pages/search/SearchPage'
import PostDetailPage from './pages/post/PostDetailPage'
import ProfilePage from './pages/profile/ProfilePage'
import FollowersPage from './pages/profile/FollowersPage'
import FollowingPage from './pages/profile/FollowingPage'
import MessagesPage from './pages/messages/MessagesPage'
import ConversationPage from './pages/messages/ConversationPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import BookmarksPage from './pages/bookmarks/BookmarksPage'
import SettingsPage from './pages/settings/SettingsPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminContentPage from './pages/admin/AdminContentPage'
import DocsPage from './pages/docs/DocsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<FeedPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/post/:id" element={<PostDetailPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/profile/:username/followers" element={<FollowersPage />} />
            <Route path="/profile/:username/following" element={<FollowingPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:id" element={<ConversationPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/content" element={<AdminContentPage />} />
            <Route path="/docs" element={<DocsPage />} />
          </Route>
        </Routes>
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  )
}
