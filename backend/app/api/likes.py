import math
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import ConflictException, NotFoundException
from app.database import get_db
from app.models.comment import Comment
from app.models.like import Like
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.like import LikeCreate, LikeResponse

router = APIRouter(tags=["Likes"])


@router.post("/posts/{post_id}/like", response_model=LikeResponse, status_code=201)
async def like_post(
    post_id: UUID,
    data: LikeCreate = LikeCreate(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LikeResponse:
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if post is None or post.is_deleted:
        raise NotFoundException("Post not found")

    existing = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id, Like.target_type == "post", Like.target_id == post_id
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already liked this post")

    like = Like(user_id=current_user.id, target_type="post", target_id=post_id, reaction=data.reaction)
    db.add(like)
    post.likes_count += 1

    if post.author_id != current_user.id:
        notification = Notification(
            user_id=post.author_id,
            actor_id=current_user.id,
            type="like",
            target_type="post",
            target_id=post.id,
        )
        db.add(notification)

    await db.flush()
    await db.refresh(like)
    return LikeResponse.model_validate(like)


@router.delete("/posts/{post_id}/like", status_code=204)
async def unlike_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id, Like.target_type == "post", Like.target_id == post_id
        )
    )
    like = result.scalar_one_or_none()
    if like is None:
        raise NotFoundException("Like not found")
    await db.delete(like)

    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if post and post.likes_count > 0:
        post.likes_count -= 1


@router.get("/posts/{post_id}/likes", response_model=PaginatedResponse[LikeResponse])
async def get_post_likes(
    post_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[LikeResponse]:
    query = (
        select(Like)
        .where(Like.target_type == "post", Like.target_id == post_id)
        .order_by(Like.created_at.desc())
    )
    count_query = select(func.count()).where(Like.target_type == "post", Like.target_id == post_id)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    likes = result.scalars().all()

    return PaginatedResponse(
        items=[LikeResponse.model_validate(lk) for lk in likes],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/comments/{comment_id}/like", response_model=LikeResponse, status_code=201)
async def like_comment(
    comment_id: UUID,
    data: LikeCreate = LikeCreate(),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LikeResponse:
    comment_result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = comment_result.scalar_one_or_none()
    if comment is None or comment.is_deleted:
        raise NotFoundException("Comment not found")

    existing = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.target_type == "comment",
            Like.target_id == comment_id,
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already liked this comment")

    like = Like(
        user_id=current_user.id, target_type="comment", target_id=comment_id, reaction=data.reaction
    )
    db.add(like)
    comment.likes_count += 1

    await db.flush()
    await db.refresh(like)
    return LikeResponse.model_validate(like)


@router.delete("/comments/{comment_id}/like", status_code=204)
async def unlike_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.target_type == "comment",
            Like.target_id == comment_id,
        )
    )
    like = result.scalar_one_or_none()
    if like is None:
        raise NotFoundException("Like not found")
    await db.delete(like)

    comment_result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = comment_result.scalar_one_or_none()
    if comment and comment.likes_count > 0:
        comment.likes_count -= 1
