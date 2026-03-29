import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief


class CommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class CommentUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)


class CommentResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    author: UserBrief
    content: str
    parent_comment_id: uuid.UUID | None
    is_deleted: bool
    likes_count: int
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False
    replies_count: int = 0

    model_config = {"from_attributes": True}
