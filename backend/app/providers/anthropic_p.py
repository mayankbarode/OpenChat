from typing import AsyncGenerator, List
import anthropic
from .base import BaseProvider
from ..models import ChatMessage, ChatResponse
import os

class AnthropicProvider(BaseProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.client = anthropic.AsyncAnthropic(api_key=self.api_key)

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> ChatResponse:
        response = await self.client.messages.create(
            model=model,
            max_tokens=kwargs.get("max_tokens", 4096),
            messages=[{"role": m.role, "content": m.content} for m in messages],
            **{k: v for k, v in kwargs.items() if k != "max_tokens"}
        )
        return ChatResponse(
            content=response.content[0].text,
            role="assistant",
            id=response.id,
            model=response.model
        )

    async def stream_chat(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncGenerator[str, None]:
        async with self.client.messages.stream(
            model=model,
            max_tokens=kwargs.get("max_tokens", 4096),
            messages=[{"role": m.role, "content": m.content} for m in messages],
            **{k: v for k, v in kwargs.items() if k != "max_tokens"}
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def list_models(self) -> List[str]:
        # Anthropic standard models
        return ["claude-3-5-sonnet-20240620", "claude-3-opus-20240229", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"]
