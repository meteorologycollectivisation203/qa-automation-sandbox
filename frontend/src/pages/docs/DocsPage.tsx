import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check, ExternalLink, ArrowLeft, Rocket, Users, Globe, Database, Target, Zap, List, Lock, FileText, MessageSquare, UserPlus, Mail, Bell, Search, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

/* ── Utility Components ── */

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 2000) }}
      className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-600 px-1.5 py-0.5 rounded hover:bg-brand-50 transition-colors" title="Copy">
      {ok ? <><Check size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
    </button>
  )
}

function Code({ code }: { code: string }) {
  return (
    <div className="relative group my-3">
      <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity"><CopyBtn text={code} /></div>
      <pre className="bg-gray-900 text-gray-100 rounded-xl p-5 overflow-x-auto text-[13px] leading-relaxed border border-gray-800"><code>{code}</code></pre>
    </div>
  )
}

function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-100 text-red-700', orange: 'bg-orange-100 text-orange-700', yellow: 'bg-yellow-100 text-yellow-700',
    green: 'bg-green-100 text-green-700', blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700',
    pink: 'bg-pink-100 text-pink-700', indigo: 'bg-indigo-100 text-indigo-700', gray: 'bg-gray-100 text-gray-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  }
  return <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', colors[color])}>{children}</span>
}

/* ── Test Case Data ── */

type Priority = 'critical' | 'high' | 'medium' | 'low'
type TCType = 'UI' | 'API' | 'Integration' | 'Security' | 'Edge Case'
type Module = 'Auth' | 'Posts' | 'Comments' | 'Follows' | 'Messages' | 'Notifications' | 'Search' | 'Admin' | 'System'

interface TestCaseData {
  id: string; module: Module; title: string; priority: Priority; type: TCType
  preconditions: string; steps: string[]; expected: string; selectors?: string[]; apiEndpoints?: string[]
}

const ALL_TEST_CASES: TestCaseData[] = [
  // AUTH
  { id: 'TC-AUTH-001', module: 'Auth', title: 'Successful login', priority: 'critical', type: 'UI',
    preconditions: 'DB in default state. User alice_dev exists and is active.',
    steps: ['Open /login', 'Enter email: alice@buzzhive.com', 'Enter password: alice123', 'Click "Sign in"'],
    expected: 'Redirect to /. Sidebar shows "Alice Developer". Feed loads.',
    selectors: ['auth-email-input', 'auth-password-input', 'auth-login-btn'] },
  { id: 'TC-AUTH-002', module: 'Auth', title: 'Login with wrong password', priority: 'critical', type: 'UI',
    preconditions: 'DB in default state.',
    steps: ['Open /login', 'Enter email: alice@buzzhive.com', 'Enter password: wrongpass', 'Click "Sign in"'],
    expected: 'Error message visible: "Invalid email or password". Stay on /login.',
    selectors: ['auth-email-input', 'auth-password-input', 'auth-login-btn', 'auth-error-message'] },
  { id: 'TC-AUTH-003', module: 'Auth', title: 'Login with banned account', priority: 'high', type: 'Integration',
    preconditions: 'User frank_banned exists with is_active=false. Verify via DB: SELECT is_active FROM users WHERE username=\'frank_banned\';',
    steps: ['Open /login', 'Enter email: frank@buzzhive.com', 'Enter password: frank123', 'Click "Sign in"'],
    expected: 'Error: "Account is deactivated". No redirect. No token stored.',
    selectors: ['auth-login-btn', 'auth-error-message'], apiEndpoints: ['POST /api/auth/login'] },
  { id: 'TC-AUTH-004', module: 'Auth', title: 'Register new account', priority: 'critical', type: 'UI',
    preconditions: 'Email and username must not already exist in DB.',
    steps: ['Open /register', 'Enter display name: "Test User"', 'Enter username: testuser_123', 'Enter email: testuser@example.com', 'Enter password: test123', 'Click "Create account"'],
    expected: 'Redirect to /login with success toast. Login with new credentials works.',
    selectors: ['auth-display-name-input', 'auth-username-input', 'auth-email-input', 'auth-password-input', 'auth-register-btn'] },
  { id: 'TC-AUTH-005', module: 'Auth', title: 'Register with duplicate email', priority: 'high', type: 'API',
    preconditions: 'User alice_dev already exists.',
    steps: ['POST /api/auth/register with body: {"email":"alice@buzzhive.com","username":"newuser","password":"pass123","display_name":"New"}'],
    expected: '409 Conflict: {"detail":"User with this email or username already exists","error_code":"CONFLICT","status_code":409}',
    apiEndpoints: ['POST /api/auth/register'] },
  { id: 'TC-AUTH-006', module: 'Auth', title: 'Token refresh flow', priority: 'high', type: 'API',
    preconditions: 'Valid refresh_token obtained from login.',
    steps: ['POST /api/auth/login to get access_token + refresh_token', 'Wait for access_token to expire (or manually use expired one)', 'GET /api/auth/me with expired token → 401', 'POST /api/auth/refresh with refresh_token', 'GET /api/auth/me with new access_token → 200'],
    expected: 'Expired token returns 401. Refresh returns new token pair. New token works.',
    apiEndpoints: ['POST /api/auth/login', 'POST /api/auth/refresh', 'GET /api/auth/me'] },
  { id: 'TC-AUTH-007', module: 'Auth', title: 'Quick login buttons fill form', priority: 'medium', type: 'UI',
    preconditions: 'On /login page.',
    steps: ['Click "Admin" quick login button', 'Check email and password fields'],
    expected: 'Email = admin@buzzhive.com, Password = admin123.',
    selectors: ['auth-email-input', 'auth-password-input'] },
  { id: 'TC-AUTH-008', module: 'Auth', title: 'Username validation rejects spaces', priority: 'medium', type: 'UI',
    preconditions: 'On /register page.',
    steps: ['Enter username: "bad user" (with space)', 'Submit form'],
    expected: 'Validation error. Username must match ^[a-zA-Z0-9_]+$.',
    selectors: ['auth-username-input', 'auth-register-btn'] },

  // POSTS
  { id: 'TC-POST-001', module: 'Posts', title: 'Create a new post', priority: 'critical', type: 'UI',
    preconditions: 'Logged in as any active user.',
    steps: ['Navigate to / (Feed)', 'Type "Hello from automation!" in composer', 'Click "Post" button'],
    expected: 'Post appears at top of feed. Toast: "Post created!". Counter resets.',
    selectors: ['post-composer-input', 'post-composer-submit'] },
  { id: 'TC-POST-002', module: 'Posts', title: 'Post with hashtags auto-links', priority: 'high', type: 'Integration',
    preconditions: 'Logged in as any user.',
    steps: ['Create post: "Testing #automation today"', 'Check that #automation is rendered as a link', 'Click the hashtag link', 'Verify Explore page opens with hashtag filter'],
    expected: 'Hashtag rendered as clickable link. Explore shows posts tagged #automation.',
    selectors: ['post-composer-input', 'post-composer-submit'], apiEndpoints: ['POST /api/posts', 'GET /api/posts?hashtag=automation'] },
  { id: 'TC-POST-003', module: 'Posts', title: 'Like and unlike a post', priority: 'critical', type: 'UI',
    preconditions: 'Logged in. At least one post visible. Post is NOT already liked.',
    steps: ['Note current like count on a post', 'Click like button (heart icon)', 'Verify count +1 and heart is filled red', 'Click like button again', 'Verify count -1 and heart is outline'],
    expected: 'Like toggles. Count increments/decrements. Heart state changes. State persists on page reload.',
    selectors: ['post-like-btn-{id}', 'post-likes-count-{id}'] },
  { id: 'TC-POST-004', module: 'Posts', title: 'Bookmark and view bookmarks', priority: 'high', type: 'UI',
    preconditions: 'Logged in. Post is not bookmarked.',
    steps: ['Click bookmark icon on a post', 'Verify icon becomes filled', 'Navigate to /bookmarks', 'Verify the post appears in bookmarks list'],
    expected: 'Bookmark icon toggles. Post appears in /bookmarks.',
    selectors: ['post-bookmark-btn-{id}', 'nav-bookmarks'] },
  { id: 'TC-POST-005', module: 'Posts', title: 'Delete own post', priority: 'high', type: 'UI',
    preconditions: 'Logged in as alice_dev. At least one own post exists.',
    steps: ['Click (...) menu on own post', 'Click "Delete"', 'Confirm in dialog'],
    expected: 'Post disappears from feed immediately.',
    selectors: ['post-menu-btn-{id}', 'post-delete-btn-{id}'] },
  { id: 'TC-POST-006', module: 'Posts', title: 'Moderator soft-deletes post', priority: 'high', type: 'Integration',
    preconditions: 'Logged in as moderator. Target post exists. Note post ID.',
    steps: ['Find any user post in feed', 'Click (...) menu → Delete', 'Login as admin → /admin/content', 'Verify post shows as [DELETED]'],
    expected: 'Post removed from public feed. Visible in admin with [DELETED] tag. deleted_by = moderator ID in DB.',
    selectors: ['post-menu-btn-{id}', 'post-delete-btn-{id}', 'admin-posts-table'],
    apiEndpoints: ['DELETE /api/posts/{id}', 'GET /api/admin/posts?is_deleted=true'] },
  { id: 'TC-POST-007', module: 'Posts', title: 'Post at max length (2000 chars)', priority: 'medium', type: 'Edge Case',
    preconditions: 'Logged in. Seed post with 2000 "A" characters exists (post_24).',
    steps: ['Open composer', 'Enter exactly 2000 characters', 'Verify counter shows 2000/2000', 'Submit', 'Verify post created', 'Also: check seed post_24 renders without breaking layout'],
    expected: 'Post created. Counter accurate. Long post renders with proper word-wrap.',
    selectors: ['post-composer-input', 'post-composer-submit'] },
  { id: 'TC-POST-008', module: 'Posts', title: 'XSS attempt in post content', priority: 'critical', type: 'Security',
    preconditions: 'Seed data loaded. Post with <script>alert("xss")</script> exists (post_25).',
    steps: ['Navigate to feed or explore', 'Find the seed post with script tag content', 'Inspect DOM to verify no <script> element exists', 'Verify content displayed as plain text'],
    expected: 'Script tag rendered as text. No JavaScript execution. Check DevTools console for no errors.',
    selectors: ['post-content-{id}'] },
  { id: 'TC-POST-009', module: 'Posts', title: 'Feed only shows followed users', priority: 'high', type: 'Integration',
    preconditions: 'Logged in as alice_dev. alice follows: bob, carol, dave, admin. Does NOT follow: eve.',
    steps: ['GET /api/posts/feed', 'Verify posts from bob_photo, carol_writes, admin, alice_dev appear', 'Verify NO posts from eve_new appear'],
    expected: 'Feed contains only own posts + posts from followed users.',
    apiEndpoints: ['GET /api/posts/feed'] },
  { id: 'TC-POST-010', module: 'Posts', title: 'Edit post within 15-min window', priority: 'medium', type: 'API',
    preconditions: 'Create a fresh post via API and note its ID.',
    steps: ['POST /api/posts with content "Original"', 'PATCH /api/posts/{id} with content "Updated" → 200', 'Verify content changed', 'Note: after 15 min the same PATCH returns 400'],
    expected: 'Edit succeeds within window. After 15 min: 400 "Posts can only be edited within 15 minutes".',
    apiEndpoints: ['POST /api/posts', 'PATCH /api/posts/{id}'] },
  { id: 'TC-POST-011', module: 'Posts', title: 'Upload image and attach to post', priority: 'high', type: 'UI',
    preconditions: 'Logged in. Have a JPEG/PNG file < 5MB.',
    steps: ['Click image button in composer', 'Select image file', 'Verify preview appears', 'Type post content', 'Click Post', 'Verify post shows with image'],
    expected: 'Image uploaded, preview shown, post created with image visible.',
    selectors: ['post-composer-image-btn', 'post-composer-file-input', 'post-composer-image-preview', 'post-composer-submit'] },
  { id: 'TC-POST-012', module: 'Posts', title: 'Empty feed for new user', priority: 'medium', type: 'UI',
    preconditions: 'Logged in as eve_new (follows only alice, has 0 own posts).',
    steps: ['Navigate to / (Feed)'],
    expected: 'Shows posts from alice (followed). If eve follows nobody: empty state message.',
    selectors: ['nav-feed'] },

  // COMMENTS
  { id: 'TC-COM-001', module: 'Comments', title: 'Add comment to post', priority: 'critical', type: 'UI',
    preconditions: 'Logged in. On a post detail page (/post/{id}).',
    steps: ['Type "Great post!" in comment input', 'Click send button', 'Verify comment appears in list'],
    expected: 'Comment appears. Post comments_count increments. Toast shown.',
    selectors: ['comment-input', 'comment-submit-btn'] },
  { id: 'TC-COM-002', module: 'Comments', title: 'Reply to a comment (nested)', priority: 'high', type: 'UI',
    preconditions: 'Post has at least one comment.',
    steps: ['Click "Reply" on a comment', 'Verify "Replying to @username" label appears', 'Type reply text', 'Click submit'],
    expected: 'Reply appears indented under parent comment.',
    selectors: ['comment-reply-btn-{id}', 'comment-input', 'comment-submit-btn'] },
  { id: 'TC-COM-003', module: 'Comments', title: 'Expand nested replies', priority: 'medium', type: 'UI',
    preconditions: 'Post has comment with replies. Seed: post about "tabs vs spaces" (post_4) has nested chain.',
    steps: ['Open post_4 detail', 'Find comment with "N replies" indicator', 'Click to expand'],
    expected: 'Nested replies load with visual indentation (border-left).',
    selectors: ['comment-{id}'] },
  { id: 'TC-COM-004', module: 'Comments', title: 'Like a comment', priority: 'medium', type: 'UI',
    preconditions: 'On post detail page with comments.',
    steps: ['Click heart icon on a comment', 'Verify count +1, heart turns red'],
    expected: 'Comment like toggles correctly.',
    selectors: ['comment-like-btn-{id}'] },

  // FOLLOWS
  { id: 'TC-FOL-001', module: 'Follows', title: 'Follow a public user', priority: 'critical', type: 'UI',
    preconditions: 'Logged in as eve_new. eve does NOT follow bob_photo.',
    steps: ['Navigate to /profile/bob_photo', 'Click "Follow" button', 'Verify button changes to "Unfollow"', 'Verify followers count incremented'],
    expected: 'Follow created. Button state changes. bob_photo receives "follow" notification.',
    selectors: ['profile-follow-btn', 'profile-followers-count'],
    apiEndpoints: ['POST /api/users/bob_photo/follow'] },
  { id: 'TC-FOL-002', module: 'Follows', title: 'Follow request for private account', priority: 'high', type: 'Integration',
    preconditions: 'Logged in as eve_new. dave_quiet is a private account (is_private=true). Verify via DB: SELECT is_private FROM users WHERE username=\'dave_quiet\';',
    steps: ['Navigate to /profile/dave_quiet', 'Verify button says "Request to Follow"', 'Click button', 'Login as dave_quiet → check notifications'],
    expected: 'Follow status = "pending". dave sees follow_request notification. Followers count unchanged until accepted.',
    selectors: ['profile-follow-btn'],
    apiEndpoints: ['POST /api/users/dave_quiet/follow', 'GET /api/follows/requests'] },
  { id: 'TC-FOL-003', module: 'Follows', title: 'Unfollow a user', priority: 'high', type: 'UI',
    preconditions: 'Logged in as alice_dev who follows bob_photo.',
    steps: ['Navigate to /profile/bob_photo', 'Verify button shows "Unfollow"', 'Click "Unfollow"', 'Verify button changes to "Follow"', 'Check feed no longer shows bob posts'],
    expected: 'Follow removed. Button reverts. Feed updates.',
    selectors: ['profile-follow-btn', 'profile-followers-count'] },
  { id: 'TC-FOL-004', module: 'Follows', title: '"Follows you" indicator', priority: 'medium', type: 'UI',
    preconditions: 'Logged in as alice_dev. bob_photo follows alice.',
    steps: ['Navigate to /profile/bob_photo', 'Check for "Follows you" badge near username'],
    expected: 'Badge visible.',
    selectors: ['profile-display-name'] },
  { id: 'TC-FOL-005', module: 'Follows', title: 'Followers and following lists', priority: 'medium', type: 'UI',
    preconditions: 'User alice_dev has followers and follows others.',
    steps: ['Navigate to /profile/alice_dev', 'Click Followers count → /profile/alice_dev/followers', 'Verify list shows users', 'Go back, click Following count → /profile/alice_dev/following'],
    expected: 'Both lists render with user avatars, names, and @usernames.',
    selectors: ['profile-followers-count', 'profile-following-count'] },
  { id: 'TC-FOL-006', module: 'Follows', title: 'Cannot follow yourself', priority: 'low', type: 'API',
    preconditions: 'Have alice_dev access token.',
    steps: ['POST /api/users/alice_dev/follow with alice_dev token'],
    expected: '400: "Cannot follow yourself".',
    apiEndpoints: ['POST /api/users/{username}/follow'] },

  // MESSAGES
  { id: 'TC-MSG-001', module: 'Messages', title: 'Start new DM conversation', priority: 'critical', type: 'UI',
    preconditions: 'Logged in. No existing DM with target user (or first DM reuses existing).',
    steps: ['Navigate to /messages', 'Click "New message"', 'Type "bob" in search field', 'Click on Bob in results'],
    expected: 'Conversation page opens. Can type and send messages.',
    selectors: ['new-conversation-btn', 'new-conversation-search', 'new-conversation-modal'] },
  { id: 'TC-MSG-002', module: 'Messages', title: 'Send a message', priority: 'critical', type: 'UI',
    preconditions: 'Inside a conversation page.',
    steps: ['Type "Hello!" in message input', 'Press Enter (or click Send)', 'Verify message appears as right-aligned blue bubble', 'Verify input clears'],
    expected: 'Message sent and displayed. Right-aligned with timestamp.',
    selectors: ['message-input', 'message-send-btn', 'message-{id}'] },
  { id: 'TC-MSG-003', module: 'Messages', title: 'Unread messages badge', priority: 'high', type: 'UI',
    preconditions: 'Login as bob_photo. alice has sent unread messages to bob (seed data).',
    steps: ['Check sidebar Messages nav item'],
    expected: 'Red badge with unread count visible on Messages icon.',
    selectors: ['nav-messages', 'nav-messages-badge'] },
  { id: 'TC-MSG-004', module: 'Messages', title: 'Opening conversation marks as read', priority: 'medium', type: 'Integration',
    preconditions: 'Conversation has unread messages.',
    steps: ['Note unread count badge on Messages', 'Open the conversation with unread messages', 'Go back to /messages', 'Verify unread count decreased'],
    expected: 'Unread count for that conversation → 0. Badge updates.',
    apiEndpoints: ['POST /api/conversations/{id}/read'] },
  { id: 'TC-MSG-005', module: 'Messages', title: 'Group conversation display', priority: 'medium', type: 'Integration',
    preconditions: 'Seed data includes "Tech Squad" group (alice + bob + carol).',
    steps: ['Login as alice', 'Open /messages', 'Find "Tech Squad" conversation', 'Open it'],
    expected: 'Group icon visible. Group name shown. Messages from different senders show sender name.',
    selectors: ['conversation-{id}', 'message-{id}'] },
  { id: 'TC-MSG-006', module: 'Messages', title: 'Start DM from user profile', priority: 'high', type: 'UI',
    preconditions: 'Logged in. Viewing another user\'s profile.',
    steps: ['Navigate to /profile/carol_writes', 'Click "Message" button'],
    expected: 'Redirected to DM conversation with carol. If DM existed, opens existing one.',
    selectors: ['profile-message-btn'],
    apiEndpoints: ['POST /api/conversations/dm/carol_writes'] },

  // NOTIFICATIONS
  { id: 'TC-NOT-001', module: 'Notifications', title: 'Unread badge in sidebar', priority: 'critical', type: 'UI',
    preconditions: 'Login as alice_dev who has unread notifications (seed data).',
    steps: ['Check sidebar Notifications icon'],
    expected: 'Red badge with number appears on icon.',
    selectors: ['nav-notifications', 'nav-notifications-badge'] },
  { id: 'TC-NOT-002', module: 'Notifications', title: 'Mark all as read', priority: 'high', type: 'UI',
    preconditions: 'User has unread notifications.',
    steps: ['Open /notifications', 'Click "Mark all read" button', 'Verify all notification highlights removed', 'Verify sidebar badge disappears'],
    expected: 'All marked read. Badge removed from sidebar.',
    selectors: ['notifications-mark-all-btn', 'nav-notifications-badge'] },
  { id: 'TC-NOT-003', module: 'Notifications', title: 'Filter unread only', priority: 'medium', type: 'UI',
    preconditions: 'Mix of read and unread notifications exist.',
    steps: ['Open /notifications', 'Click "Unread" filter tab', 'Verify only unread notifications shown', 'Click "All" tab', 'Verify all notifications shown'],
    expected: 'Filter toggles correctly between all and unread.',
    selectors: ['notifications-filter-all', 'notifications-filter-unread'] },
  { id: 'TC-NOT-004', module: 'Notifications', title: 'Click notification navigates', priority: 'high', type: 'UI',
    preconditions: 'User has a "liked your post" notification.',
    steps: ['Open /notifications', 'Click a "liked your post" notification'],
    expected: 'Navigates to the post detail page. Notification marked as read.',
    selectors: ['notification-{id}'] },
  { id: 'TC-NOT-005', module: 'Notifications', title: 'Like generates notification', priority: 'high', type: 'Integration',
    preconditions: 'Two active users exist. User A has a post.',
    steps: ['Login as eve_new', 'Like a post by alice_dev', 'Logout', 'Login as alice_dev', 'Open /notifications'],
    expected: '"Eve Newbie liked your post" notification appears.',
    apiEndpoints: ['POST /api/posts/{id}/like', 'GET /api/notifications'] },

  // SEARCH
  { id: 'TC-SRC-001', module: 'Search', title: 'Search users by name', priority: 'high', type: 'UI',
    preconditions: 'Seed data loaded. On /search page.',
    steps: ['Type "alice" in search input', 'Press Enter', 'Check Users tab'],
    expected: 'alice_dev appears in results. Click navigates to profile.',
    selectors: ['nav-search-input'] },
  { id: 'TC-SRC-002', module: 'Search', title: 'Search posts by content', priority: 'high', type: 'UI',
    preconditions: 'Seed data loaded.',
    steps: ['Search "debugging"', 'Check Posts tab'],
    expected: 'Alice\'s "debugging at 2am" post appears.',
    selectors: ['nav-search-input'] },
  { id: 'TC-SRC-003', module: 'Search', title: 'Search hashtags', priority: 'medium', type: 'UI',
    preconditions: 'Seed data loaded.',
    steps: ['Search "coding"', 'Check Hashtags tab'],
    expected: '#coding shown with correct post count.',
    selectors: ['nav-search-input'] },
  { id: 'TC-SRC-004', module: 'Search', title: 'Empty search results', priority: 'low', type: 'UI',
    preconditions: 'On /search page.',
    steps: ['Search "zzzznonexistent"'],
    expected: 'All tabs show 0 results with "No X found" messages.',
    selectors: ['nav-search-input'] },

  // ADMIN
  { id: 'TC-ADM-001', module: 'Admin', title: 'Dashboard shows stats', priority: 'high', type: 'UI',
    preconditions: 'Logged in as admin.',
    steps: ['Navigate to /admin', 'Check stats cards'],
    expected: 'Cards show total users, active users, total posts, comments, messages.',
    selectors: ['admin-stats-users-count', 'admin-stats-posts-count', 'nav-admin'] },
  { id: 'TC-ADM-002', module: 'Admin', title: 'Ban a user', priority: 'critical', type: 'Integration',
    preconditions: 'Logged in as admin. Target user is active.',
    steps: ['Go to /admin/users', 'Find alice_dev row', 'Click "Ban" button', 'Logout', 'Try to login as alice_dev'],
    expected: 'User banned (is_active=false). alice_dev login fails with "Account is deactivated". Verify in DB: SELECT is_active FROM users WHERE username=\'alice_dev\';',
    selectors: ['admin-ban-btn-{id}', 'admin-user-row-{id}'],
    apiEndpoints: ['PATCH /api/admin/users/{id}'] },
  { id: 'TC-ADM-003', module: 'Admin', title: 'Change user role', priority: 'high', type: 'UI',
    preconditions: 'Logged in as admin.',
    steps: ['Go to /admin/users', 'Find eve_new', 'Change role dropdown to "moderator"', 'Logout, login as eve_new'],
    expected: 'eve_new now sees Admin nav link in sidebar.',
    selectors: ['admin-role-select-{id}', 'nav-admin'] },
  { id: 'TC-ADM-004', module: 'Admin', title: 'Regular user blocked from admin', priority: 'critical', type: 'Security',
    preconditions: 'Logged in as alice_dev (role=user).',
    steps: ['Verify no Admin link in sidebar', 'Manually navigate to /admin', 'Try GET /api/admin/stats with alice token'],
    expected: 'No admin link visible. API returns 403 Forbidden.',
    selectors: ['nav-admin'],
    apiEndpoints: ['GET /api/admin/stats'] },
  { id: 'TC-ADM-005', module: 'Admin', title: 'Moderate-delete post with reason', priority: 'high', type: 'Integration',
    preconditions: 'Logged in as moderator. Note a post ID to delete.',
    steps: ['Go to /admin/content', 'Click Delete on a post', 'Enter reason in prompt', 'Verify post marked [DELETED]', 'Check DB: SELECT deleted_by, deleted_reason FROM posts WHERE id=\'...\';'],
    expected: 'Post soft-deleted. Reason stored. deleted_by = moderator UUID.',
    apiEndpoints: ['DELETE /api/admin/posts/{id}'] },

  // EDGE CASES
  { id: 'TC-EDGE-001', module: 'System', title: 'SQL injection in content is safe', priority: 'critical', type: 'Security',
    preconditions: 'Seed data loaded. Post with SQL injection exists (post_25).',
    steps: ['Find seed post containing: \'; DROP TABLE posts; --', 'Verify it renders as plain text', 'Run SQL: SELECT COUNT(*) FROM posts; — verify tables exist'],
    expected: 'Content is plain text. Database intact. No tables dropped.',
    apiEndpoints: ['GET /api/posts'] },
  { id: 'TC-EDGE-002', module: 'System', title: 'XSS attempt in content', priority: 'critical', type: 'Security',
    preconditions: 'Seed data loaded. Post with <script> tag exists (post_25).',
    steps: ['Find seed post with script tag', 'Open browser DevTools Console', 'Verify no JS executed', 'Inspect DOM — no <script> element'],
    expected: 'Content escaped. No script execution.',
    selectors: ['post-content-{id}'] },
  { id: 'TC-EDGE-003', module: 'System', title: 'Unicode and multilingual content', priority: 'medium', type: 'Edge Case',
    preconditions: 'Seed post_25 contains Chinese, Arabic, Russian, emoji.',
    steps: ['Find the unicode post in feed', 'Verify all characters render correctly', 'Verify no encoding artifacts'],
    expected: 'All scripts display correctly: Chinese, Arabic, Russian, emoji flags.',
    selectors: ['post-content-{id}'] },
  { id: 'TC-EDGE-004', module: 'System', title: 'Duplicate like returns 409', priority: 'medium', type: 'API',
    preconditions: 'Logged in. Have access token.',
    steps: ['POST /api/posts/{id}/like → 201', 'POST /api/posts/{id}/like again'],
    expected: '409: {"detail":"Already liked this post","error_code":"CONFLICT","status_code":409}',
    apiEndpoints: ['POST /api/posts/{id}/like'] },
  { id: 'TC-EDGE-005', module: 'System', title: 'Duplicate follow returns 409', priority: 'medium', type: 'API',
    preconditions: 'Already following target user.',
    steps: ['POST /api/users/{username}/follow again'],
    expected: '409: "Already following or request pending".',
    apiEndpoints: ['POST /api/users/{username}/follow'] },
  { id: 'TC-EDGE-006', module: 'System', title: '404 on non-existent resource', priority: 'medium', type: 'API',
    preconditions: 'Have access token.',
    steps: ['GET /api/posts/00000000-0000-0000-0000-000000000999'],
    expected: '404: {"detail":"Post not found","error_code":"NOT_FOUND","status_code":404}',
    apiEndpoints: ['GET /api/posts/{id}'] },
  { id: 'TC-EDGE-007', module: 'System', title: 'Upload oversized image (>5MB)', priority: 'medium', type: 'API',
    preconditions: 'Have a file > 5MB.',
    steps: ['POST /api/upload/image with file > 5MB'],
    expected: '400: "File size exceeds 5MB limit".',
    apiEndpoints: ['POST /api/upload/image'] },
  { id: 'TC-EDGE-008', module: 'System', title: 'Upload non-image file', priority: 'medium', type: 'API',
    preconditions: 'Have a .txt or .pdf file.',
    steps: ['POST /api/upload/image with .txt file'],
    expected: '400: "Only JPEG, PNG, GIF, WebP images are allowed".',
    apiEndpoints: ['POST /api/upload/image'] },
  { id: 'TC-EDGE-009', module: 'System', title: 'Database reset re-seeds data', priority: 'high', type: 'Integration',
    preconditions: 'Some custom data created (posts, users, etc.).',
    steps: ['Create a post via API', 'POST /api/reset', 'GET /api/posts — check custom post is gone', 'Verify seed users exist: GET /api/users'],
    expected: 'All custom data deleted. 8 seed users, 25+ posts restored.',
    apiEndpoints: ['POST /api/reset', 'GET /api/posts', 'GET /api/users'] },
  { id: 'TC-EDGE-010', module: 'System', title: 'Private account post visibility', priority: 'high', type: 'Integration',
    preconditions: 'dave_quiet is private. carol_writes has pending (not accepted) follow to dave.',
    steps: ['Login as carol_writes', 'GET /api/users/dave_quiet/posts', 'Verify followers_only posts are not returned', 'Login as alice_dev (accepted follower)', 'GET /api/users/dave_quiet/posts'],
    expected: 'Non-follower cannot see followers_only posts. Accepted follower can.',
    apiEndpoints: ['GET /api/users/{username}/posts'] },
]

const MODULES: Module[] = ['Auth', 'Posts', 'Comments', 'Follows', 'Messages', 'Notifications', 'Search', 'Admin', 'System']
const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']
const TYPES: TCType[] = ['UI', 'API', 'Integration', 'Security', 'Edge Case']

function TestCasesSection() {
  const [filterModule, setFilterModule] = useState<Module | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [filterType, setFilterType] = useState<TCType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = ALL_TEST_CASES.filter(tc => {
    if (filterModule !== 'all' && tc.module !== filterModule) return false
    if (filterPriority !== 'all' && tc.priority !== filterPriority) return false
    if (filterType !== 'all' && tc.type !== filterType) return false
    if (searchQuery && !tc.title.toLowerCase().includes(searchQuery.toLowerCase()) && !tc.id.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const pColor: Record<string, string> = { critical: 'red', high: 'orange', medium: 'yellow', low: 'gray' }
  const tColor: Record<string, string> = { UI: 'blue', API: 'purple', Integration: 'indigo', Security: 'red', 'Edge Case': 'pink' }

  return (
    <section id="test-cases" className="mb-16 scroll-mt-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Test Cases</h2>
      <p className="text-gray-500 text-sm mb-5">{ALL_TEST_CASES.length} cases total. Click a row to expand details, preconditions, steps, and selectors.</p>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Search</label>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Filter by ID or title..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500" data-testid="tc-search-input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Module</label>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value as Module | 'all')} data-testid="tc-filter-module"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option value="all">All modules</option>
              {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Priority</label>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value as Priority | 'all')} data-testid="tc-filter-priority"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option value="all">All priorities</option>
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mb-1">Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value as TCType | 'all')} data-testid="tc-filter-type"
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option value="all">All types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="text-xs text-gray-400">Showing {filtered.length} of {ALL_TEST_CASES.length} test cases</div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b text-xs text-gray-500 font-medium">
              <th className="text-left py-2.5 px-4 w-28">ID</th>
              <th className="text-left py-2.5 px-2 w-20">Module</th>
              <th className="text-left py-2.5 px-2">Title</th>
              <th className="text-left py-2.5 px-2 w-20">Priority</th>
              <th className="text-left py-2.5 px-4 w-24">Type</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(tc => (
              <>
                <tr key={tc.id}
                  onClick={() => setExpandedId(expandedId === tc.id ? null : tc.id)}
                  className={cn('border-b border-gray-50 cursor-pointer transition-colors', expandedId === tc.id ? 'bg-brand-50/50' : 'hover:bg-gray-50')}
                  data-testid={`test-case-${tc.id}`}>
                  <td className="py-2.5 px-4 font-mono text-xs text-gray-400">{tc.id}</td>
                  <td className="py-2.5 px-2 text-xs text-gray-500">{tc.module}</td>
                  <td className="py-2.5 px-2 font-medium text-gray-800">{tc.title}</td>
                  <td className="py-2.5 px-2"><Badge color={pColor[tc.priority]}>{tc.priority}</Badge></td>
                  <td className="py-2.5 px-4"><Badge color={tColor[tc.type]}>{tc.type}</Badge></td>
                </tr>
                {expandedId === tc.id && (
                  <tr key={`${tc.id}-detail`}>
                    <td colSpan={5} className="px-4 py-4 bg-gray-50/50 border-b">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Preconditions */}
                        <div>
                          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Preconditions</h5>
                          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">{tc.preconditions}</div>
                        </div>
                        {/* Steps */}
                        <div>
                          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Steps</h5>
                          <div className="space-y-1">
                            {tc.steps.map((step, i) => (
                              <div key={i} className="flex gap-2 text-xs">
                                <span className="font-mono text-gray-400 w-4 text-right shrink-0">{i+1}.</span>
                                <span className="text-gray-700">{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Expected */}
                        <div>
                          <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Expected Result</h5>
                          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-800">{tc.expected}</div>
                        </div>
                        {/* Selectors + API */}
                        <div>
                          {tc.selectors && tc.selectors.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">UI Selectors (data-testid)</h5>
                              <div className="flex flex-wrap gap-1">{tc.selectors.map(s => <code key={s} className="text-[10px] bg-white border px-2 py-0.5 rounded font-mono">{s}</code>)}</div>
                            </div>
                          )}
                          {tc.apiEndpoints && tc.apiEndpoints.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">API Endpoints</h5>
                              <div className="flex flex-wrap gap-1">{tc.apiEndpoints.map(e => <code key={e} className="text-[10px] bg-white border px-2 py-0.5 rounded font-mono">{e}</code>)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No test cases match your filters.</div>
        )}
      </div>
    </section>
  )
}

/* ── Navigation Structure ── */
const sections = [
  { id: 'getting-started', title: 'Getting Started', Icon: Rocket },
  { id: 'accounts', title: 'Test Accounts', Icon: Users },
  { id: 'swagger', title: 'Swagger & API Access', Icon: Globe },
  { id: 'database', title: 'Database Access', Icon: Database },
  { id: 'selectors', title: 'data-testid Reference', Icon: Target },
  { id: 'api', title: 'API Examples', Icon: Zap },
  { id: 'endpoints', title: 'All Endpoints (65)', Icon: List },
  { id: 'test-cases', title: 'Test Cases', Icon: FileText },
]

/* ── Main Component ── */
export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('getting-started')

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      }
    }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 })

    sections.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar Navigation ── */}
      <aside className="hidden lg:block w-72 shrink-0 border-r border-gray-200 bg-gray-50/80 h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 border-b border-gray-200">
            <Link to="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-3">
              <ArrowLeft size={14} /> Back to app
            </Link>
            <h2 className="text-lg font-bold text-gray-900">QA Documentation</h2>
            <p className="text-xs text-gray-500 mt-0.5">Test cases & API reference</p>
        </div>
        <nav className="p-3">
            {sections.map(({ id, title, Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={cn(
                  'flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors',
                  activeSection === id
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <Icon size={15} className="shrink-0 opacity-60" />
                <span className="truncate">{title}</span>
              </button>
            ))}
        </nav>
        <div className="p-5 border-t border-gray-200 mt-2">
          <div className="flex flex-col gap-2">
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600">
              <ExternalLink size={11} /> Swagger UI
            </a>
            <a href="http://localhost:8000/redoc" target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600">
              <ExternalLink size={11} /> ReDoc
            </a>
            <a href="http://localhost:8081" target="_blank" rel="noopener" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600">
              <ExternalLink size={11} /> pgweb (DB)
            </a>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 min-w-0 max-w-4xl mx-auto px-8 lg:px-12 py-10">

          {/* Getting Started */}
          <section id="getting-started" className="mb-16 scroll-mt-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">QA Sandbox Documentation</h1>
            <p className="text-gray-500 text-lg mb-6">Everything you need to write UI, API, and integration tests</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <a href="http://localhost:8000/docs" target="_blank" rel="noopener"
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600"><Globe size={20} /></div>
                <div><p className="font-semibold text-sm">Swagger UI</p><p className="text-xs text-gray-400">Interactive API docs</p></div>
                <ExternalLink size={14} className="ml-auto text-gray-300" />
              </a>
              <a href="http://localhost:8081" target="_blank" rel="noopener"
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600"><Database size={20} /></div>
                <div><p className="font-semibold text-sm">pgweb</p><p className="text-xs text-gray-400">Database web UI</p></div>
                <ExternalLink size={14} className="ml-auto text-gray-300" />
              </a>
              <a href="http://localhost:3000" target="_blank" rel="noopener"
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-brand-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center text-brand-600"><Target size={20} /></div>
                <div><p className="font-semibold text-sm">Frontend</p><p className="text-xs text-gray-400">Social network UI</p></div>
                <ExternalLink size={14} className="ml-auto text-gray-300" />
              </a>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <b>Reset anytime:</b> If tests break your data, call <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">POST /api/reset</code> or use the Reset button in Settings. This drops all tables and re-seeds fresh data.
            </div>
          </section>

          {/* Test Accounts */}
          <section id="accounts" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Test Accounts</h2>
            <p className="text-gray-500 text-sm mb-4">Pre-seeded on startup. Password pattern: <code className="bg-gray-100 px-1 rounded text-xs">{'{prefix}123'}</code></p>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b"><th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Username</th><th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Email</th><th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Password</th><th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Role</th><th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">Notes</th></tr></thead>
                <tbody>
                  {[
                    ['admin', 'admin@buzzhive.com', 'admin123', 'admin', 'Full access, manage users, moderate content'],
                    ['moderator', 'mod@buzzhive.com', 'mod123', 'moderator', 'Can delete posts/comments, no user mgmt'],
                    ['alice_dev', 'alice@buzzhive.com', 'alice123', 'user', 'Active, 8 posts, many followers, verified'],
                    ['bob_photo', 'bob@buzzhive.com', 'bob123', 'user', 'Photography posts with image URLs'],
                    ['carol_writes', 'carol@buzzhive.com', 'carol123', 'user', 'Long-form content, technical writer'],
                    ['dave_quiet', 'dave@buzzhive.com', 'dave123', 'user', 'PRIVATE — follow request required'],
                    ['eve_new', 'eve@buzzhive.com', 'eve123', 'user', 'New user, zero posts (empty states)'],
                    ['frank_banned', 'frank@buzzhive.com', 'frank123', 'user', 'BANNED — login fails'],
                  ].map(([user, email, pass, role, notes]) => (
                    <tr key={user} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-4 font-mono text-xs">{user}</td>
                      <td className="py-2.5 px-4 font-mono text-xs text-gray-500">{email}</td>
                      <td className="py-2.5 px-4"><code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono">{pass}</code> <CopyBtn text={pass as string} /></td>
                      <td className="py-2.5 px-4"><Badge color={role === 'admin' ? 'red' : role === 'moderator' ? 'yellow' : 'gray'}>{role}</Badge></td>
                      <td className="py-2.5 px-4 text-xs text-gray-500">{notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Swagger */}
          <section id="swagger" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Swagger & API Access</h2>
            <p className="text-gray-500 text-sm mb-4">Interactive docs at <a href="http://localhost:8000/docs" target="_blank" className="text-brand-600 hover:underline">localhost:8000/docs</a></p>

            <h3 className="text-lg font-semibold mb-3 text-gray-800">How to authorize in Swagger</h3>
            <div className="space-y-2 mb-6">
              {[
                'Open Swagger UI at http://localhost:8000/docs',
                'Find POST /api/auth/login → click "Try it out"',
                'Enter: {"email":"alice@buzzhive.com","password":"alice123"}',
                'Click Execute → copy the access_token from response',
                'Click the 🔒 Authorize button (top right of page)',
                'In the value field enter: Bearer <your_token>',
                'Click Authorize → all protected endpoints now work',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                  <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                </div>
              ))}
            </div>

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Quick token via CLI</h3>
            <Code code={`# Get token (one-liner)
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@buzzhive.com","password":"alice123"}' \\
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo $TOKEN

# Use in any request
curl http://localhost:8000/api/auth/me -H "Authorization: Bearer $TOKEN"`} />
          </section>

          {/* Database */}
          <section id="database" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Database Access</h2>
            <p className="text-gray-500 text-sm mb-4">PostgreSQL 16 — connect via <a href="http://localhost:8081" target="_blank" className="text-brand-600 hover:underline">pgweb</a>, DBeaver, pgAdmin, DataGrip, etc.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Connection Details</h4>
                <div className="space-y-1 text-sm font-mono">
                  <p><span className="text-gray-400">Host:</span> localhost</p>
                  <p><span className="text-gray-400">Port:</span> 5432</p>
                  <p><span className="text-gray-400">Database:</span> buzzhive</p>
                  <p><span className="text-gray-400">Username:</span> buzzhive_user</p>
                  <p><span className="text-gray-400">Password:</span> buzzhive_password</p>
                </div>
              </div>
              <div className="bg-white border rounded-xl p-4">
                <h4 className="font-semibold text-sm mb-2 text-gray-700">Connection Strings</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-0.5">PostgreSQL URI</p>
                    <div className="flex items-center gap-1"><code className="text-[11px] bg-gray-50 px-2 py-1 rounded border break-all flex-1">postgresql://buzzhive_user:buzzhive_password@localhost:5432/buzzhive</code><CopyBtn text="postgresql://buzzhive_user:buzzhive_password@localhost:5432/buzzhive" /></div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase font-medium mb-0.5">JDBC (Java / IntelliJ)</p>
                    <div className="flex items-center gap-1"><code className="text-[11px] bg-gray-50 px-2 py-1 rounded border break-all flex-1">jdbc:postgresql://localhost:5432/buzzhive</code><CopyBtn text="jdbc:postgresql://localhost:5432/buzzhive" /></div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Tables (13)</h3>
            <div className="flex flex-wrap gap-1.5 mb-6">
              {['users','refresh_tokens','follows','posts','hashtags','post_hashtags','comments','likes','bookmarks','conversations','conversation_participants','messages','notifications'].map(t => (
                <code key={t} className="text-xs bg-white border px-2.5 py-1 rounded-lg">{t}</code>
              ))}
            </div>

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Useful SQL Queries</h3>
            <Code code={`-- Active users with post counts
SELECT u.username, u.role, u.is_active, COUNT(p.id) as posts
FROM users u LEFT JOIN posts p ON p.author_id = u.id AND p.is_deleted = false
GROUP BY u.id ORDER BY posts DESC;

-- Posts with most likes
SELECT p.content, p.likes_count, u.username
FROM posts p JOIN users u ON u.id = p.author_id
WHERE p.is_deleted = false ORDER BY p.likes_count DESC LIMIT 10;

-- Follow relationships
SELECT f1.username as follower, f2.username as following, fl.status
FROM follows fl JOIN users f1 ON f1.id = fl.follower_id JOIN users f2 ON f2.id = fl.following_id;

-- Unread notifications per user
SELECT u.username, COUNT(*) as unread FROM notifications n
JOIN users u ON u.id = n.user_id WHERE n.is_read = false GROUP BY u.username;

-- Conversations with message counts
SELECT c.id, c.is_group, c.name, COUNT(m.id) as messages
FROM conversations c LEFT JOIN messages m ON m.conversation_id = c.id GROUP BY c.id;`} />
          </section>

          {/* Selectors */}
          <section id="selectors" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">data-testid Reference</h2>
            <p className="text-gray-500 text-sm mb-4">Pattern: <code className="bg-gray-100 px-1.5 rounded text-xs">domain-element-shortId</code>. Seed data IDs: post 1 → <code className="bg-gray-100 px-1 rounded text-xs">1</code>, post 25 → <code className="bg-gray-100 px-1 rounded text-xs">25</code>.</p>

            {[
              { name: 'Auth', items: ['auth-email-input', 'auth-password-input', 'auth-username-input', 'auth-display-name-input', 'auth-login-btn', 'auth-register-btn', 'auth-logout-btn', 'auth-error-message'] },
              { name: 'Navigation', items: ['nav-feed', 'nav-explore', 'nav-search', 'nav-messages', 'nav-notifications', 'nav-bookmarks', 'nav-profile', 'nav-settings', 'nav-admin', 'nav-docs', 'nav-logo'] },
              { name: 'Posts', items: ['post-card-{id}', 'post-author-{id}', 'post-content-{id}', 'post-like-btn-{id}', 'post-likes-count-{id}', 'post-comment-btn-{id}', 'post-comments-count-{id}', 'post-repost-btn-{id}', 'post-bookmark-btn-{id}', 'post-menu-btn-{id}', 'post-edit-btn-{id}', 'post-delete-btn-{id}', 'post-composer-input', 'post-composer-submit', 'post-composer-image-btn', 'post-composer-file-input'] },
              { name: 'Comments', items: ['comment-{id}', 'comment-like-btn-{id}', 'comment-reply-btn-{id}', 'comment-input', 'comment-submit-btn'] },
              { name: 'Profile', items: ['profile-avatar', 'profile-display-name', 'profile-username', 'profile-bio', 'profile-role', 'profile-follow-btn', 'profile-message-btn', 'profile-edit-btn', 'profile-followers-count', 'profile-following-count', 'profile-posts-count'] },
              { name: 'Messages', items: ['conversation-{id}', 'message-{id}', 'message-input', 'message-send-btn', 'new-conversation-btn', 'new-conversation-search', 'new-conversation-modal'] },
              { name: 'Notifications', items: ['notification-{id}', 'notification-mark-read-btn-{id}', 'notifications-mark-all-btn', 'notifications-unread-badge', 'notifications-filter-all', 'notifications-filter-unread'] },
              { name: 'Admin', items: ['admin-users-table', 'admin-user-row-{id}', 'admin-role-select-{id}', 'admin-verify-btn-{id}', 'admin-ban-btn-{id}', 'admin-search-input', 'admin-stats-users-count', 'admin-stats-posts-count'] },
              { name: 'System', items: ['reset-database-btn'] },
            ].map(({ name, items }) => (
              <div key={name} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{name}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map(s => <code key={s} className="text-[11px] bg-white border px-2.5 py-1 rounded-lg font-mono hover:bg-brand-50 hover:border-brand-200 transition-colors">{s}</code>)}
                </div>
              </div>
            ))}
          </section>

          {/* API Examples */}
          <section id="api" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">API Examples</h2>
            <p className="text-gray-500 text-sm mb-4">Base URL: <code className="bg-gray-100 px-1.5 rounded text-xs font-mono">http://localhost:8000/api</code></p>

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Authentication</h3>
            <Code code={`# Register
curl -X POST http://localhost:8000/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{"email":"test@example.com","username":"testuser","password":"test123","display_name":"Test User"}'

# Login → returns access_token + refresh_token
curl -X POST http://localhost:8000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"alice@buzzhive.com","password":"alice123"}'

# Refresh token
curl -X POST http://localhost:8000/api/auth/refresh \\
  -H "Content-Type: application/json" \\
  -d '{"refresh_token":"eyJ..."}'`} />

            <h3 className="text-lg font-semibold mb-2 text-gray-800">CRUD Operations</h3>
            <Code code={`# Create post
curl -X POST http://localhost:8000/api/posts \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"content":"Hello world! #testing","visibility":"public"}'

# Feed (paginated)
curl "http://localhost:8000/api/posts/feed?page=1&per_page=10" -H "Authorization: Bearer $TOKEN"

# Like with reaction
curl -X POST http://localhost:8000/api/posts/{id}/like \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"reaction":"love"}'

# Follow user
curl -X POST http://localhost:8000/api/users/bob_photo/follow -H "Authorization: Bearer $TOKEN"

# Send message
curl -X POST http://localhost:8000/api/conversations/{id}/messages \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"content":"Hey there!"}'

# Search
curl "http://localhost:8000/api/search/users?q=alice" -H "Authorization: Bearer $TOKEN"`} />

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Error Responses</h3>
            <Code code={`# 401 Unauthorized
{"detail":"Invalid or expired token","error_code":"UNAUTHORIZED","status_code":401}

# 403 Forbidden
{"detail":"Role 'user' is not allowed","error_code":"FORBIDDEN","status_code":403}

# 404 Not Found
{"detail":"Post not found","error_code":"NOT_FOUND","status_code":404}

# 409 Conflict
{"detail":"Already liked this post","error_code":"CONFLICT","status_code":409}

# 422 Validation
{"detail":[{"type":"string_too_short","loc":["body","content"],"msg":"String should have at least 1 character"}]}`} />

            <h3 className="text-lg font-semibold mb-2 text-gray-800">Pagination Format</h3>
            <Code code={`{
  "items": [...],
  "total": 25,
  "page": 1,
  "per_page": 20,
  "pages": 2
}
// Params: ?page=1&per_page=20&sort_by=created_at&sort_order=desc`} />
          </section>

          {/* All Endpoints */}
          <section id="endpoints" className="mb-16 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">All API Endpoints (65)</h2>
            <div className="space-y-6">
              {[
                { group: 'Auth', endpoints: ['POST /api/auth/register — Register new user','POST /api/auth/login — Login (returns tokens)','POST /api/auth/refresh — Refresh access token','POST /api/auth/logout — Revoke refresh token','GET  /api/auth/me — Current user profile'] },
                { group: 'Users', endpoints: ['GET  /api/users — List (search, sort, paginate)','GET  /api/users/suggestions — Who to follow','GET  /api/users/{username} — Profile','PATCH /api/users/me — Update profile','POST /api/users/me/avatar — Upload avatar','DELETE /api/users/me/avatar — Remove avatar','GET  /api/users/{username}/posts — Posts','GET  /api/users/{username}/followers — Followers','GET  /api/users/{username}/following — Following'] },
                { group: 'Follows', endpoints: ['POST /api/users/{username}/follow — Follow','DELETE /api/users/{username}/follow — Unfollow','GET  /api/follows/requests — Pending requests','POST /api/follows/requests/{id}/accept','POST /api/follows/requests/{id}/reject'] },
                { group: 'Posts', endpoints: ['GET  /api/posts — Public timeline','GET  /api/posts/feed — Personal feed','POST /api/posts — Create','GET  /api/posts/{id} — Get','PATCH /api/posts/{id} — Edit (15 min)','DELETE /api/posts/{id} — Delete','POST /api/posts/{id}/repost — Repost/quote','POST /api/posts/{id}/pin — Pin','DELETE /api/posts/{id}/pin — Unpin'] },
                { group: 'Comments', endpoints: ['GET  /api/posts/{id}/comments — List','POST /api/posts/{id}/comments — Add','PATCH /api/comments/{id} — Edit','DELETE /api/comments/{id} — Delete','GET  /api/comments/{id}/replies — Replies','POST /api/comments/{id}/replies — Reply'] },
                { group: 'Likes', endpoints: ['POST /api/posts/{id}/like — Like','DELETE /api/posts/{id}/like — Unlike','GET  /api/posts/{id}/likes — Who liked','POST /api/comments/{id}/like — Like','DELETE /api/comments/{id}/like — Unlike'] },
                { group: 'Bookmarks', endpoints: ['GET  /api/bookmarks — List','POST /api/posts/{id}/bookmark — Add','DELETE /api/posts/{id}/bookmark — Remove'] },
                { group: 'Messages', endpoints: ['GET  /api/conversations — List','POST /api/conversations — Create','POST /api/conversations/dm/{username} — Find/create DM','GET  /api/conversations/{id} — Get','GET  /api/conversations/{id}/messages — Messages','POST /api/conversations/{id}/messages — Send','DELETE /api/messages/{id} — Delete','POST /api/conversations/{id}/read — Mark read'] },
                { group: 'Notifications', endpoints: ['GET  /api/notifications — List','GET  /api/notifications/unread-count — Count','POST /api/notifications/{id}/read — Mark read','POST /api/notifications/read-all — Mark all'] },
                { group: 'Search', endpoints: ['GET  /api/search/users?q= — Users','GET  /api/search/posts?q= — Posts','GET  /api/search/hashtags?q= — Hashtags','GET  /api/search/trending/hashtags — Trending'] },
                { group: 'Admin', endpoints: ['GET  /api/admin/stats — Stats','GET  /api/admin/users — Users','PATCH /api/admin/users/{id} — Update','DELETE /api/admin/users/{id} — Deactivate','GET  /api/admin/posts — Posts','DELETE /api/admin/posts/{id} — Moderate'] },
                { group: 'System', endpoints: ['GET  /api/health — Health','POST /api/reset — Reset DB','POST /api/upload/image — Upload (5MB)'] },
              ].map(({ group, endpoints }) => (
                <div key={group} className="bg-white border rounded-xl p-4">
                  <h4 className="font-semibold text-sm text-gray-800 mb-2">{group}</h4>
                  <div className="space-y-1">
                    {endpoints.map((e, i) => {
                      const parts = e.match(/^(\S+)\s+(\S+)\s*—?\s*(.*)$/)
                      if (!parts) return null
                      const [, method, path, desc] = parts
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs font-mono py-0.5">
                          <span className={cn('w-14 text-right font-bold shrink-0',
                            method === 'GET' ? 'text-green-600' : method === 'POST' ? 'text-blue-600' : method === 'PATCH' ? 'text-amber-600' : 'text-red-600'
                          )}>{method}</span>
                          <span className="text-gray-800">{path}</span>
                          {desc && <span className="text-gray-400 font-sans">— {desc}</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── TEST CASES ── */}
          <TestCasesSection />

          <div className="text-center py-8 border-t border-gray-100 text-gray-400 text-xs">
            QA Sandbox Documentation — Reset: <code className="bg-gray-100 px-1.5 rounded">POST /api/reset</code>
          </div>
      </main>
    </div>
  )
}
