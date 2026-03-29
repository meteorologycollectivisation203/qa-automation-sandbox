import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    display_name: str
    bio: str | None
    avatar_url: str | None
    cover_url: str | None
    role: str
    is_active: bool
    is_verified: bool
    is_private: bool
    created_at: datetime
    updated_at: datetime
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: bool = False
    is_followed_by: bool = False

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    avatar_url: str | None
    is_verified: bool

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=500)
    is_private: bool | None = None


class AdminUserUpdate(BaseModel):
    role: str | None = Field(default=None, pattern=r"^(user|moderator|admin)$")
    is_active: bool | None = None
    is_verified: bool | None = None
