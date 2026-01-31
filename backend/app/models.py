from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str
    content: str
    image_url: Optional[str] = None  # Base64 data URL for images (data:image/jpeg;base64,...)
    metadata: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    provider: str
    stream: bool = True
    apiKey: Optional[str] = None
    baseUrl: Optional[str] = None
    conversationId: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    content: str
    role: str
    id: Optional[str] = None
    model: Optional[str] = None
    finish_reason: Optional[str] = None
class SettingsUpdate(BaseModel):
    api_keys: Optional[Dict[str, str]] = None
    base_urls: Optional[Dict[str, str]] = None
    selected_provider: Optional[str] = None
    selected_model: Optional[str] = None
