import math
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_role
from app.core.exceptions import NotFoundException
from app.database import get_db
from app.models.comment import Comment
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.post import Post
from app.models.user import User
from app.schemas.admin import AdminStatsResponse
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.schemas.user import AdminUserUpdate, UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminStatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "moderator")),
) -> AdminStatsResponse:
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0
    active_users = (
        await db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True)))
    ).scalar() or 0
    total_posts = (
        await db.execute(select(func.count()).select_from(Post).where(Post.is_deleted.is_(False)))
    ).scalar() or 0
    total_comments = (
        await db.execute(select(func.count()).select_from(Comment).where(Comment.is_deleted.is_(False)))
    ).scalar() or 0
    total_conversations = (
        await db.execute(select(func.count()).select_from(Conversation))
    ).scalar() or 0
    total_messages = (
        await db.execute(select(func.count()).select_from(Message).where(Message.is_deleted.is_(False)))
    ).scalar() or 0

    return AdminStatsResponse(
        total_users=total_users,
        active_users=active_users,
        total_posts=total_posts,
        total_comments=total_comments,
        total_conversations=total_conversations,
        total_messages=total_messages,
    )


@router.get("/users", response_model=PaginatedResponse[UserResponse])
async def list_all_users(
    search: str | None = None,
    role: str | None = None,
    is_active: bool | None = None,
    sort_by: str = Query(default="created_at", pattern=r"^(created_at|username|email)$"),
    sort_order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "moderator")),
) -> PaginatedResponse[UserResponse]:
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if search:
        sf = User.username.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        query = query.where(sf)
        count_query = count_query.where(sf)
    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    sort_col = getattr(User, sort_by)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> UserResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("User not found")

    if data.role is not None:
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    if data.is_verified is not None:
        user.is_verified = data.is_verified

    await db.flush()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=204)
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException("User not found")
    user.is_active = False


@router.get("/posts", response_model=PaginatedResponse[PostResponse])
async def list_all_posts(
    is_deleted: bool | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "moderator")),
) -> PaginatedResponse[PostResponse]:
    query = select(Post).order_by(Post.created_at.desc())
    count_query = select(func.count()).select_from(Post)

    if is_deleted is not None:
        query = query.where(Post.is_deleted == is_deleted)
        count_query = count_query.where(Post.is_deleted == is_deleted)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    posts = result.scalars().all()

    return PaginatedResponse(
        items=[PostResponse.model_validate(p) for p in posts],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.delete("/posts/{post_id}", status_code=204)
async def moderate_delete_post(
    post_id: UUID,
    reason: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin", "moderator")),
) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise NotFoundException("Post not found")
    post.is_deleted = True
    post.deleted_by = current_user.id
    post.deleted_reason = reason
