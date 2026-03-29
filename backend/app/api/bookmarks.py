import math
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictException, NotFoundException
from app.database import get_db
from app.models.bookmark import Bookmark
from app.models.post import Post
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostResponse

router = APIRouter(tags=["Bookmarks"])


@router.get("/bookmarks", response_model=PaginatedResponse[PostResponse])
async def list_bookmarks(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    query = (
        select(Post)
        .join(Bookmark, Bookmark.post_id == Post.id)
        .where(Bookmark.user_id == current_user.id, Post.is_deleted.is_(False))
        .order_by(Bookmark.created_at.desc())
    )
    count_query = (
        select(func.count())
        .select_from(Bookmark)
        .join(Post, Bookmark.post_id == Post.id)
        .where(Bookmark.user_id == current_user.id, Post.is_deleted.is_(False))
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    posts = result.scalars().all()

    items = []
    for p in posts:
        resp = PostResponse.model_validate(p)
        resp.is_bookmarked = True
        items.append(resp)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/posts/{post_id}/bookmark", status_code=201)
async def bookmark_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    if post_result.scalar_one_or_none() is None:
        raise NotFoundException("Post not found")

    existing = await db.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.post_id == post_id)
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already bookmarked")

    bookmark = Bookmark(user_id=current_user.id, post_id=post_id)
    db.add(bookmark)
    return {"status": "bookmarked"}


@router.delete("/posts/{post_id}/bookmark", status_code=204)
async def unbookmark_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.post_id == post_id)
    )
    bookmark = result.scalar_one_or_none()
    if bookmark is None:
        raise NotFoundException("Bookmark not found")
    await db.delete(bookmark)
