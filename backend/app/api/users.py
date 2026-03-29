import math
import os
import uuid as uuid_mod
from pathlib import Path

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, NotFoundException
from app.database import get_db
from app.models.follow import Follow
from app.models.post import Post
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse
from app.schemas.user import UserBrief, UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


async def _enrich_user(user: User, current_user: User, db: AsyncSession) -> UserResponse:
    followers_q = select(func.count()).where(Follow.following_id == user.id, Follow.status == "accepted")
    following_q = select(func.count()).where(Follow.follower_id == user.id, Follow.status == "accepted")
    posts_q = select(func.count()).where(Post.author_id == user.id, Post.is_deleted.is_(False))

    followers_count = (await db.execute(followers_q)).scalar() or 0
    following_count = (await db.execute(following_q)).scalar() or 0
    posts_count = (await db.execute(posts_q)).scalar() or 0

    is_following = False
    is_followed_by = False
    if current_user.id != user.id:
        fwd = await db.execute(
            select(Follow).where(
                Follow.follower_id == current_user.id,
                Follow.following_id == user.id,
                Follow.status == "accepted",
            )
        )
        is_following = fwd.scalar_one_or_none() is not None
        rev = await db.execute(
            select(Follow).where(
                Follow.follower_id == user.id,
                Follow.following_id == current_user.id,
                Follow.status == "accepted",
            )
        )
        is_followed_by = rev.scalar_one_or_none() is not None

    return UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        display_name=user.display_name,
        bio=user.bio,
        avatar_url=user.avatar_url,
        cover_url=user.cover_url,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        is_private=user.is_private,
        created_at=user.created_at,
        updated_at=user.updated_at,
        followers_count=followers_count,
        following_count=following_count,
        posts_count=posts_count,
        is_following=is_following,
        is_followed_by=is_followed_by,
    )


@router.get("", response_model=PaginatedResponse[UserBrief])
async def list_users(
    search: str | None = None,
    sort_by: str = Query(default="created_at", pattern=r"^(created_at|username|display_name)$"),
    sort_order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[UserBrief]:
    query = select(User).where(User.is_active.is_(True))
    count_query = select(func.count()).select_from(User).where(User.is_active.is_(True))

    if search:
        search_filter = User.username.ilike(f"%{search}%") | User.display_name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    sort_col = getattr(User, sort_by)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = (await db.execute(count_query)).scalar() or 0
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserBrief.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/suggestions", response_model=list[UserBrief])
async def get_suggestions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[UserBrief]:
    """Return up to 5 active users that the current user does not follow yet."""
    already_following = (
        select(Follow.following_id)
        .where(Follow.follower_id == current_user.id)
    )
    query = (
        select(User)
        .where(
            User.is_active.is_(True),
            User.id != current_user.id,
            User.id.notin_(already_following),
        )
        .order_by(func.random())
        .limit(5)
    )
    result = await db.execute(query)
    users = result.scalars().all()
    return [UserBrief.model_validate(u) for u in users]


@router.get("/{username}", response_model=UserResponse)
async def get_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException(f"User '{username}' not found")
    return await _enrich_user(user, current_user, db)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if data.display_name is not None:
        current_user.display_name = data.display_name
    if data.bio is not None:
        current_user.bio = data.bio
    if data.is_private is not None:
        current_user.is_private = data.is_private
    await db.flush()
    await db.refresh(current_user)
    return await _enrich_user(current_user, current_user, db)


@router.post("/me/avatar", response_model=UserResponse)
async def upload_avatar(
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if file.content_type not in ("image/jpeg", "image/png", "image/gif", "image/webp"):
        raise BadRequestException("Only JPEG, PNG, GIF, WebP images are allowed")
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise BadRequestException("File size exceeds 5MB limit")

    ext = file.filename.split(".")[-1] if file.filename else "jpg"
    filename = f"avatars/{uuid_mod.uuid4()}.{ext}"
    filepath = Path(settings.UPLOAD_DIR) / filename
    filepath.parent.mkdir(parents=True, exist_ok=True)
    filepath.write_bytes(content)

    current_user.avatar_url = f"/uploads/{filename}"
    await db.flush()
    await db.refresh(current_user)
    return await _enrich_user(current_user, current_user, db)


@router.delete("/me/avatar", status_code=204)
async def delete_avatar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    if current_user.avatar_url:
        filepath = Path(settings.UPLOAD_DIR) / current_user.avatar_url.lstrip("/uploads/")
        if filepath.exists():
            os.remove(filepath)
    current_user.avatar_url = None
    await db.flush()


@router.get("/{username}/posts", response_model=PaginatedResponse[PostResponse])
async def get_user_posts(
    username: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException(f"User '{username}' not found")

    query = (
        select(Post)
        .where(Post.author_id == user.id, Post.is_deleted.is_(False))
        .order_by(Post.is_pinned.desc(), Post.created_at.desc())
    )
    count_query = select(func.count()).select_from(Post).where(
        Post.author_id == user.id, Post.is_deleted.is_(False)
    )

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


@router.get("/{username}/followers", response_model=PaginatedResponse[UserBrief])
async def get_followers(
    username: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[UserBrief]:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException(f"User '{username}' not found")

    query = (
        select(User)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == user.id, Follow.status == "accepted")
    )
    count_query = select(func.count()).where(Follow.following_id == user.id, Follow.status == "accepted")

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserBrief.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/{username}/following", response_model=PaginatedResponse[UserBrief])
async def get_following(
    username: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[UserBrief]:
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundException(f"User '{username}' not found")

    query = (
        select(User)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == user.id, Follow.status == "accepted")
    )
    count_query = select(func.count()).where(Follow.follower_id == user.id, Follow.status == "accepted")

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserBrief.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )
