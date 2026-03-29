import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.user import UserBrief


class LikeCreate(BaseModel):
    reaction: str = Field(default="like", pattern=r"^(like|love|laugh|wow|sad|angry)$")


class LikeResponse(BaseModel):
    id: uuid.UUID
    user: UserBrief
    reaction: str
    created_at: datetime

    model_config = {"from_attributes": True}
