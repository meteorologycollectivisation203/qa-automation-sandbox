import math
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.database import get_db
from app.models.follow import Follow
from app.models.notification import Notification
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.follow import FollowRequestResponse, FollowResponse

router = APIRouter(tags=["Follows"])


@router.post("/users/{username}/follow", response_model=FollowResponse, status_code=201)
async def follow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FollowResponse:
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise NotFoundException(f"User '{username}' not found")
    if target.id == current_user.id:
        raise BadRequestException("Cannot follow yourself")

    existing = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == target.id)
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Already following or request pending")

    status = "pending" if target.is_private else "accepted"
    follow = Follow(follower_id=current_user.id, following_id=target.id, status=status)
    db.add(follow)

    notif_type = "follow_request" if status == "pending" else "follow"
    notification = Notification(
        user_id=target.id, actor_id=current_user.id, type=notif_type
    )
    db.add(notification)

    await db.flush()
    await db.refresh(follow)
    return FollowResponse.model_validate(follow)


@router.delete("/users/{username}/follow", status_code=204)
async def unfollow_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise NotFoundException(f"User '{username}' not found")

    follow_result = await db.execute(
        select(Follow).where(Follow.follower_id == current_user.id, Follow.following_id == target.id)
    )
    follow = follow_result.scalar_one_or_none()
    if follow is None:
        raise NotFoundException("Not following this user")
    await db.delete(follow)


@router.get("/follows/requests", response_model=PaginatedResponse[FollowRequestResponse])
async def get_follow_requests(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[FollowRequestResponse]:
    from sqlalchemy import func

    query = (
        select(Follow)
        .where(Follow.following_id == current_user.id, Follow.status == "pending")
        .order_by(Follow.created_at.desc())
    )
    count_query = select(func.count()).where(
        Follow.following_id == current_user.id, Follow.status == "pending"
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    follows = result.scalars().all()

    return PaginatedResponse(
        items=[FollowRequestResponse.model_validate(f) for f in follows],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/follows/requests/{follow_id}/accept", response_model=FollowResponse)
async def accept_follow_request(
    follow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FollowResponse:
    result = await db.execute(select(Follow).where(Follow.id == follow_id))
    follow = result.scalar_one_or_none()
    if follow is None:
        raise NotFoundException("Follow request not found")
    if follow.following_id != current_user.id:
        raise ForbiddenException("Not your follow request")
    if follow.status != "pending":
        raise BadRequestException("Request already processed")

    follow.status = "accepted"

    notification = Notification(
        user_id=follow.follower_id, actor_id=current_user.id, type="follow"
    )
    db.add(notification)

    await db.flush()
    await db.refresh(follow)
    return FollowResponse.model_validate(follow)


@router.post("/follows/requests/{follow_id}/reject", status_code=204)
async def reject_follow_request(
    follow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Follow).where(Follow.id == follow_id))
    follow = result.scalar_one_or_none()
    if follow is None:
        raise NotFoundException("Follow request not found")
    if follow.following_id != current_user.id:
        raise ForbiddenException("Not your follow request")
    if follow.status != "pending":
        raise BadRequestException("Request already processed")

    follow.status = "rejected"
