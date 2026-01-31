from abc import ABC, abstractmethod
from typing import AsyncGenerator, List
from ..models import ChatMessage, ChatResponse

class BaseProvider(ABC):
    @abstractmethod
    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> ChatResponse:
        pass

    @abstractmethod
    async def stream_chat(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def list_models(self) -> List[str]:
        pass
