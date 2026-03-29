import math
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.database import get_db
from app.models.bookmark import Bookmark
from app.models.follow import Follow
from app.models.hashtag import Hashtag, post_hashtags
from app.models.like import Like
from app.models.notification import Notification
from app.models.post import Post
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.post import PostCreate, PostResponse, PostUpdate, RepostCreate

router = APIRouter(prefix="/posts", tags=["Posts"])


async def _extract_hashtags(content: str, post_id: UUID, db: AsyncSession) -> None:
    tags = set(re.findall(r"#(\w+)", content))
    for tag_name in tags:
        tag_lower = tag_name.lower()
        result = await db.execute(select(Hashtag).where(Hashtag.name == tag_lower))
        hashtag = result.scalar_one_or_none()
        if hashtag is None:
            hashtag = Hashtag(name=tag_lower)
            db.add(hashtag)
            await db.flush()
        hashtag.posts_count += 1
        await db.execute(post_hashtags.insert().values(post_id=post_id, hashtag_id=hashtag.id))


async def _enrich_post(post: Post, current_user: User, db: AsyncSession) -> PostResponse:
    like_result = await db.execute(
        select(Like).where(
            Like.user_id == current_user.id,
            Like.target_type == "post",
            Like.target_id == post.id,
        )
    )
    like = like_result.scalar_one_or_none()

    bm_result = await db.execute(
        select(Bookmark).where(Bookmark.user_id == current_user.id, Bookmark.post_id == post.id)
    )
    is_bookmarked = bm_result.scalar_one_or_none() is not None

    resp = PostResponse.model_validate(post)
    resp.is_liked = like is not None
    resp.is_bookmarked = is_bookmarked
    resp.user_reaction = like.reaction if like else None
    return resp


@router.get("", response_model=PaginatedResponse[PostResponse])
async def list_posts(
    hashtag: str | None = None,
    author_id: UUID | None = None,
    sort_by: str = Query(default="created_at", pattern=r"^(created_at|likes_count|comments_count)$"),
    sort_order: str = Query(default="desc", pattern=r"^(asc|desc)$"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    query = select(Post).where(Post.is_deleted.is_(False), Post.visibility == "public")
    count_base = select(func.count()).select_from(Post).where(
        Post.is_deleted.is_(False), Post.visibility == "public"
    )

    if author_id:
        query = query.where(Post.author_id == author_id)
        count_base = count_base.where(Post.author_id == author_id)

    if hashtag:
        query = query.join(post_hashtags).join(Hashtag).where(Hashtag.name == hashtag.lower())
        count_base = (
            select(func.count())
            .select_from(Post)
            .join(post_hashtags)
            .join(Hashtag)
            .where(Post.is_deleted.is_(False), Post.visibility == "public", Hashtag.name == hashtag.lower())
        )

    sort_col = getattr(Post, sort_by)
    query = query.order_by(sort_col.desc() if sort_order == "desc" else sort_col.asc())

    total = (await db.execute(count_base)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    posts = result.scalars().all()

    items = [await _enrich_post(p, current_user, db) for p in posts]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.get("/feed", response_model=PaginatedResponse[PostResponse])
async def get_feed(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[PostResponse]:
    following_ids = select(Follow.following_id).where(
        Follow.follower_id == current_user.id, Follow.status == "accepted"
    )
    query = (
        select(Post)
        .where(
            Post.is_deleted.is_(False),
            Post.author_id.in_(following_ids) | (Post.author_id == current_user.id),
        )
        .order_by(Post.created_at.desc())
    )
    count_query = (
        select(func.count())
        .select_from(Post)
        .where(
            Post.is_deleted.is_(False),
            Post.author_id.in_(following_ids) | (Post.author_id == current_user.id),
        )
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    posts = result.scalars().all()

    items = [await _enrich_post(p, current_user, db) for p in posts]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    data: PostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    post = Post(
        author_id=current_user.id,
        content=data.content,
        image_url=data.image_url,
        visibility=data.visibility,
    )
    db.add(post)
    await db.flush()
    await _extract_hashtags(data.content, post.id, db)
    await db.refresh(post)
    return await _enrich_post(post, current_user, db)


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None or post.is_deleted:
        raise NotFoundException("Post not found")
    return await _enrich_post(post, current_user, db)


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None or post.is_deleted:
        raise NotFoundException("Post not found")
    if post.author_id != current_user.id:
        raise ForbiddenException("Not the author")

    if datetime.now(timezone.utc) - post.created_at.replace(tzinfo=timezone.utc) > timedelta(minutes=15):
        raise BadRequestException("Posts can only be edited within 15 minutes of creation")

    post.content = data.content
    await db.flush()
    await db.refresh(post)
    return await _enrich_post(post, current_user, db)


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: UUID,
    reason: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise NotFoundException("Post not found")
    if post.author_id != current_user.id and current_user.role not in ("admin", "moderator"):
        raise ForbiddenException("Not authorized to delete this post")

    post.is_deleted = True
    if current_user.id != post.author_id:
        post.deleted_by = current_user.id
        post.deleted_reason = reason


@router.post("/{post_id}/repost", response_model=PostResponse, status_code=201)
async def repost(
    post_id: UUID,
    data: RepostCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PostResponse:
    result = await db.execute(select(Post).where(Post.id == post_id))
    original = result.scalar_one_or_none()
    if original is None or original.is_deleted:
        raise NotFoundException("Post not found")

    content = data.content or original.content
    repost_post = Post(
        author_id=current_user.id,
        content=content,
        parent_id=original.id,
        repost_type=data.repost_type,
    )
    db.add(repost_post)
    original.reposts_count += 1

    notification = Notification(
        user_id=original.author_id,
        actor_id=current_user.id,
        type="repost",
        target_type="post",
        target_id=original.id,
    )
    db.add(notification)

    await db.flush()
    await db.refresh(repost_post)
    return await _enrich_post(repost_post, current_user, db)


@router.post("/{post_id}/pin", status_code=204)
async def pin_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None or post.is_deleted:
        raise NotFoundException("Post not found")
    if post.author_id != current_user.id:
        raise ForbiddenException("Not the author")

    await db.execute(
        select(Post)
        .where(Post.author_id == current_user.id, Post.is_pinned.is_(True))
    )
    # Unpin all existing pinned posts
    existing_pinned = await db.execute(
        select(Post).where(Post.author_id == current_user.id, Post.is_pinned.is_(True))
    )
    for p in existing_pinned.scalars().all():
        p.is_pinned = False

    post.is_pinned = True


@router.delete("/{post_id}/pin", status_code=204)
async def unpin_post(
    post_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if post is None:
        raise NotFoundException("Post not found")
    if post.author_id != current_user.id:
        raise ForbiddenException("Not the author")
    post.is_pinned = False
