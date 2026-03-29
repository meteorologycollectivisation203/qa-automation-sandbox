import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief


class PostCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    image_url: str | None = None
    visibility: str = Field(default="public", pattern=r"^(public|followers_only)$")


class PostUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class RepostCreate(BaseModel):
    repost_type: str = Field(default="repost", pattern=r"^(repost|quote)$")
    content: str | None = Field(default=None, max_length=2000)


class HashtagResponse(BaseModel):
    id: uuid.UUID
    name: str
    posts_count: int

    model_config = {"from_attributes": True}


class PostResponse(BaseModel):
    id: uuid.UUID
    author: UserBrief
    content: str
    image_url: str | None
    is_pinned: bool
    is_deleted: bool
    parent_id: uuid.UUID | None
    repost_type: str | None
    visibility: str
    likes_count: int
    comments_count: int
    reposts_count: int
    hashtags: list[HashtagResponse] = []
    created_at: datetime
    updated_at: datetime
    is_liked: bool = False
    is_bookmarked: bool = False
    user_reaction: str | None = None

    model_config = {"from_attributes": True}


class PostDeleteRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=255)
