import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief


class ConversationCreate(BaseModel):
    participant_ids: list[uuid.UUID] = Field(min_length=1)
    is_group: bool = False
    name: str | None = Field(default=None, max_length=100)


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    image_url: str | None = None


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: UserBrief | None
    content: str
    image_url: str | None
    is_deleted: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConversationResponse(BaseModel):
    id: uuid.UUID
    is_group: bool
    name: str | None
    participants: list[UserBrief] = []
    last_message: MessageResponse | None = None
    unread_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
