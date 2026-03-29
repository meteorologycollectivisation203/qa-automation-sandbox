import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.hashtag import Hashtag
from app.models.post import Post
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import HashtagResponse, PostResponse
from app.schemas.user import UserBrief

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/users", response_model=PaginatedResponse[UserBrief])
async def search_users(
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[UserBrief]:
    search_filter = User.username.ilike(f"%{q}%") | User.display_name.ilike(f"%{q}%")
    query = select(User).where(User.is_active.is_(True), search_filter).order_by(User.username)
    count_query = select(func.count()).select_from(User).where(User.is_active.is_(True), search_filter)

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


@router.get("/posts", response_model=PaginatedResponse[PostResponse])
async def search_posts(
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    query = (
        select(Post)
        .where(
            Post.is_deleted.is_(False),
            Post.visibility == "public",
            Post.content.ilike(f"%{q}%"),
        )
        .order_by(Post.created_at.desc())
    )
    count_query = select(func.count()).select_from(Post).where(
        Post.is_deleted.is_(False), Post.visibility == "public", Post.content.ilike(f"%{q}%")
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


@router.get("/hashtags", response_model=PaginatedResponse[HashtagResponse])
async def search_hashtags(
    q: str = Query(min_length=1, max_length=200),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[HashtagResponse]:
    query = (
        select(Hashtag)
        .where(Hashtag.name.ilike(f"%{q.lower()}%"))
        .order_by(Hashtag.posts_count.desc())
    )
    count_query = select(func.count()).select_from(Hashtag).where(Hashtag.name.ilike(f"%{q.lower()}%"))

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    hashtags = result.scalars().all()

    return PaginatedResponse(
        items=[HashtagResponse.model_validate(h) for h in hashtags],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/trending/hashtags", response_model=list[HashtagResponse])
async def trending_hashtags(
    period: str = Query(default="week", pattern=r"^(day|week)$"),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HashtagResponse]:
    query = select(Hashtag).order_by(Hashtag.posts_count.desc()).limit(limit)
    result = await db.execute(query)
    hashtags = result.scalars().all()
    return [HashtagResponse.model_validate(h) for h in hashtags]
