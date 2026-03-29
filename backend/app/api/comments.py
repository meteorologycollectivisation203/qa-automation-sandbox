import math
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException, NotFoundException
from app.database import get_db
from app.models.comment import Comment
from app.models.like import Like
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse, CommentUpdate
from app.schemas.common import PaginatedResponse

router = APIRouter(tags=["Comments"])


async def _enrich_comment(comment: Comment, current_user: User, db: AsyncSession) -> CommentResponse:
    like_result = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.target_type == "comment",
            Like.target_id == comment.id,
        )
    )
    is_liked = like_result.scalar_one_or_none() is not None

    replies_count = (
        await db.execute(
            select(func.count()).where(
                Comment.parent_comment_id == comment.id, Comment.is_deleted.is_(False)
            )
        )
    ).scalar() or 0

    resp = CommentResponse.model_validate(comment)
    resp.is_liked = is_liked
    resp.replies_count = replies_count
    return resp


@router.get("/posts/{post_id}/comments", response_model=PaginatedResponse[CommentResponse])
async def list_comments(
    post_id: UUID,
    sort_by: str = Query(default="created_at", pattern=r"^(created_at|likes_count)$"),
    sort_order: str = Query(default="asc", pattern=r"^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[CommentResponse]:
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    if post_result.scalar_one_or_none() is None:
        raise NotFoundException("Post not found")

    query = select(Comment).where(
        Comment.post_id == post_id,
        Comment.parent_comment_id.is_(None),
        Comment.is_deleted.is_(False),
    )
    count_query = select(func.count()).where(
        Comment.post_id == post_id,
        Comment.parent_comment_id.is_(None),
        Comment.is_deleted.is_(False),
    )

    sort_col = getattr(Comment, sort_by)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    comments = result.scalars().all()

    items = [await _enrich_comment(c, current_user, db) for c in comments]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    post_id: UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    post_result = await db.execute(select(Post).where(Post.id == post_id))
    post = post_result.scalar_one_or_none()
    if post is None or post.is_deleted:
        raise NotFoundException("Post not found")

    comment = Comment(post_id=post_id, author_id=current_user.id, content=data.content)
    db.add(comment)
    post.comments_count += 1

    if post.author_id != current_user.id:
        notification = Notification(
            user_id=post.author_id,
            actor_id=current_user.id,
            type="comment",
            target_type="post",
            target_id=post.id,
        )
        db.add(notification)

    await db.flush()
    await db.refresh(comment)
    return await _enrich_comment(comment, current_user, db)


@router.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    data: CommentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None or comment.is_deleted:
        raise NotFoundException("Comment not found")
    if comment.author_id != current_user.id:
        raise ForbiddenException("Not the author")

    comment.content = data.content
    await db.flush()
    await db.refresh(comment)
    return await _enrich_comment(comment, current_user, db)


@router.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        raise NotFoundException("Comment not found")
    if comment.author_id != current_user.id and current_user.role not in ("admin", "moderator"):
        raise ForbiddenException("Not authorized")

    comment.is_deleted = True
    if current_user.id != comment.author_id:
        comment.deleted_by = current_user.id

    # Decrement post comment count
    post_result = await db.execute(select(Post).where(Post.id == comment.post_id))
    post = post_result.scalar_one_or_none()
    if post and post.comments_count > 0:
        post.comments_count -= 1


@router.get("/comments/{comment_id}/replies", response_model=PaginatedResponse[CommentResponse])
async def list_replies(
    comment_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[CommentResponse]:
    parent_result = await db.execute(select(Comment).where(Comment.id == comment_id))
    if parent_result.scalar_one_or_none() is None:
        raise NotFoundException("Comment not found")

    query = (
        select(Comment)
        .where(Comment.parent_comment_id == comment_id, Comment.is_deleted.is_(False))
        .order_by(Comment.created_at.asc())
    )
    count_query = select(func.count()).where(
        Comment.parent_comment_id == comment_id, Comment.is_deleted.is_(False)
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    comments = result.scalars().all()

    items = [await _enrich_comment(c, current_user, db) for c in comments]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/comments/{comment_id}/replies", response_model=CommentResponse, status_code=201)
async def reply_to_comment(
    comment_id: UUID,
    data: CommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CommentResponse:
    parent_result = await db.execute(select(Comment).where(Comment.id == comment_id))
    parent = parent_result.scalar_one_or_none()
    if parent is None or parent.is_deleted:
        raise NotFoundException("Comment not found")

    comment = Comment(
        post_id=parent.post_id,
        author_id=current_user.id,
        content=data.content,
        parent_comment_id=comment_id,
    )
    db.add(comment)

    if parent.author_id != current_user.id:
        notification = Notification(
            user_id=parent.author_id,
            actor_id=current_user.id,
            type="comment",
            target_type="comment",
            target_id=parent.id,
        )
        db.add(notification)

    await db.flush()
    await db.refresh(comment)
    return await _enrich_comment(comment, current_user, db)
