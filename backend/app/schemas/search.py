from pydantic import BaseModel, Field

from app.schemas.post import HashtagResponse, PostResponse
from app.schemas.user import UserBrief


class SearchQuery(BaseModel):
    q: str = Field(min_length=1, max_length=200)


class UserSearchResult(BaseModel):
    users: list[UserBrief]
    total: int


class PostSearchResult(BaseModel):
    posts: list[PostResponse]
    total: int


class HashtagSearchResult(BaseModel):
    hashtags: list[HashtagResponse]
    total: int
