from fastapi import APIRouter

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.bookmarks import router as bookmarks_router
from app.api.comments import router as comments_router
from app.api.follows import router as follows_router
from app.api.likes import router as likes_router
from app.api.messages import router as messages_router
from app.api.notifications import router as notifications_router
from app.api.posts import router as posts_router
from app.api.search import router as search_router
from app.api.system import router as system_router
from app.api.upload import router as upload_router
from app.api.users import router as users_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(follows_router)
api_router.include_router(posts_router)
api_router.include_router(comments_router)
api_router.include_router(likes_router)
api_router.include_router(bookmarks_router)
api_router.include_router(messages_router)
api_router.include_router(notifications_router)
api_router.include_router(search_router)
api_router.include_router(admin_router)
api_router.include_router(upload_router)
api_router.include_router(system_router)
