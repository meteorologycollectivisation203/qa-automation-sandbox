from pydantic import BaseModel


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_posts: int
    total_comments: int
    total_conversations: int
    total_messages: int
