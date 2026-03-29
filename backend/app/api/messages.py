import math
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.core.exceptions import ForbiddenException, NotFoundException
from app.database import get_db
from app.models.conversation import Conversation, ConversationParticipant
from app.models.message import Message
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.message import ConversationCreate, ConversationResponse, MessageCreate, MessageResponse
from app.schemas.user import UserBrief

router = APIRouter(tags=["Messages"])


async def _build_conversation_response(
    conv: Conversation, current_user: User, db: AsyncSession
) -> ConversationResponse:
    participants = [UserBrief.model_validate(p.user) for p in conv.participants]

    last_msg_result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id, Message.is_deleted.is_(False))
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_msg = last_msg_result.scalar_one_or_none()

    participant = next((p for p in conv.participants if p.user_id == current_user.id), None)
    unread_count = 0
    if participant and participant.last_read_at:
        unread_result = await db.execute(
            select(func.count()).where(
                Message.conversation_id == conv.id,
                Message.created_at > participant.last_read_at,
                Message.sender_id != current_user.id,
                Message.is_deleted.is_(False),
            )
        )
        unread_count = unread_result.scalar() or 0
    elif participant:
        unread_result = await db.execute(
            select(func.count()).where(
                Message.conversation_id == conv.id,
                Message.sender_id != current_user.id,
                Message.is_deleted.is_(False),
            )
        )
        unread_count = unread_result.scalar() or 0

    return ConversationResponse(
        id=conv.id,
        is_group=conv.is_group,
        name=conv.name,
        participants=participants,
        last_message=MessageResponse.model_validate(last_msg) if last_msg else None,
        unread_count=unread_count,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("/conversations", response_model=PaginatedResponse[ConversationResponse])
async def list_conversations(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[ConversationResponse]:
    query = (
        select(Conversation)
        .join(ConversationParticipant)
        .where(ConversationParticipant.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    count_query = (
        select(func.count())
        .select_from(ConversationParticipant)
        .where(ConversationParticipant.user_id == current_user.id)
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    conversations = result.scalars().all()

    items = [await _build_conversation_response(c, current_user, db) for c in conversations]
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    all_participant_ids = list(set(data.participant_ids) | {current_user.id})

    conv = Conversation(is_group=data.is_group or len(all_participant_ids) > 2, name=data.name)
    db.add(conv)
    await db.flush()

    for uid in all_participant_ids:
        participant = ConversationParticipant(conversation_id=conv.id, user_id=uid)
        db.add(participant)

    await db.flush()
    await db.refresh(conv)
    return await _build_conversation_response(conv, current_user, db)


@router.post("/conversations/dm/{username}", response_model=ConversationResponse, status_code=200)
async def find_or_create_dm(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """Find or create a 1:1 DM conversation with the given user."""
    result = await db.execute(select(User).where(User.username == username))
    target = result.scalar_one_or_none()
    if target is None:
        raise NotFoundException(f"User '{username}' not found")
    if target.id == current_user.id:
        raise ForbiddenException("Cannot start a DM with yourself")

    # Look for an existing non-group conversation with exactly these two participants
    my_convs = (
        select(ConversationParticipant.conversation_id)
        .where(ConversationParticipant.user_id == current_user.id)
    )
    target_convs = (
        select(ConversationParticipant.conversation_id)
        .where(ConversationParticipant.user_id == target.id)
    )
    existing_result = await db.execute(
        select(Conversation)
        .where(
            Conversation.is_group.is_(False),
            Conversation.id.in_(my_convs),
            Conversation.id.in_(target_convs),
        )
        .limit(1)
    )
    existing_conv = existing_result.scalar_one_or_none()

    if existing_conv is not None:
        return await _build_conversation_response(existing_conv, current_user, db)

    # Create a new DM conversation
    conv = Conversation(is_group=False, name=None)
    db.add(conv)
    await db.flush()

    for uid in [current_user.id, target.id]:
        participant = ConversationParticipant(conversation_id=conv.id, user_id=uid)
        db.add(participant)

    await db.flush()
    await db.refresh(conv)
    return await _build_conversation_response(conv, current_user, db)


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if conv is None:
        raise NotFoundException("Conversation not found")

    is_participant = any(p.user_id == current_user.id for p in conv.participants)
    if not is_participant:
        raise ForbiddenException("Not a participant")

    return await _build_conversation_response(conv, current_user, db)


@router.get("/conversations/{conversation_id}/messages", response_model=PaginatedResponse[MessageResponse])
async def list_messages(
    conversation_id: UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PaginatedResponse[MessageResponse]:
    conv_result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = conv_result.scalar_one_or_none()
    if conv is None:
        raise NotFoundException("Conversation not found")
    if not any(p.user_id == current_user.id for p in conv.participants):
        raise ForbiddenException("Not a participant")

    query = (
        select(Message)
        .where(Message.conversation_id == conversation_id, Message.is_deleted.is_(False))
        .order_by(Message.created_at.desc())
    )
    count_query = select(func.count()).where(
        Message.conversation_id == conversation_id, Message.is_deleted.is_(False)
    )

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    messages = result.scalars().all()

    return PaginatedResponse(
        items=[MessageResponse.model_validate(m) for m in messages],
        total=total,
        page=page,
        per_page=per_page,
        pages=math.ceil(total / per_page) if total > 0 else 0,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    conv_result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = conv_result.scalar_one_or_none()
    if conv is None:
        raise NotFoundException("Conversation not found")
    if not any(p.user_id == current_user.id for p in conv.participants):
        raise ForbiddenException("Not a participant")

    message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=data.content,
        image_url=data.image_url,
    )
    db.add(message)
    conv.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.refresh(message)
    return MessageResponse.model_validate(message)


@router.delete("/messages/{message_id}", status_code=204)
async def delete_message(
    message_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Message).where(Message.id == message_id))
    message = result.scalar_one_or_none()
    if message is None:
        raise NotFoundException("Message not found")
    if message.sender_id != current_user.id:
        raise ForbiddenException("Not the sender")
    message.is_deleted = True


@router.post("/conversations/{conversation_id}/read", status_code=204)
async def mark_conversation_read(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == current_user.id,
        )
    )
    participant = result.scalar_one_or_none()
    if participant is None:
        raise NotFoundException("Not a participant")
    participant.last_read_at = datetime.now(timezone.utc)
