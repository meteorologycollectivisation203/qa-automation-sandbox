import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserBrief


class NotificationResponse(BaseModel):
    id: uuid.UUID
    actor: UserBrief | None
    type: str
    target_type: str | None
    target_id: uuid.UUID | None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountResponse(BaseModel):
    count: int
