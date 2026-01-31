from datetime import datetime
from typing import List, Optional
from beanie import Document, Indexed
from pydantic import Field, EmailStr, BaseModel

class Message(BaseModel): # Pydantic model for embedding
    role: str
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class User(Document):
    email: Optional[str] = None
    username: Indexed(str, unique=True)
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # User Preferences
    api_keys: dict = Field(default_factory=dict)
    base_urls: dict = Field(default_factory=lambda: {"vllm": "http://localhost:8000/v1"})
    selected_provider: str = "openai"
    selected_model: str = "gpt-4o"

    class Settings:
        name = "users"

class Conversation(Document):
    title: str = "New Chat"
    user_id: Indexed(str) # Reference to User._id
    messages: List[dict] = [] # List of {role, content, timestamp}
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "conversations"
