import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserBrief


class FollowResponse(BaseModel):
    id: uuid.UUID
    follower: UserBrief
    following: UserBrief
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FollowRequestResponse(BaseModel):
    id: uuid.UUID
    follower: UserBrief
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
