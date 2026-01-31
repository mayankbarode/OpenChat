from typing import AsyncGenerator, List
from openai import AsyncOpenAI
from .base import BaseProvider
from ..models import ChatMessage, ChatResponse
import os

class OpenAIProvider(BaseProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.client = AsyncOpenAI(api_key=self.api_key)

    def _format_messages(self, messages: List[ChatMessage]) -> List[dict]:
        """Format messages for OpenAI API, handling images for vision models"""
        formatted = []
        for m in messages:
            if m.image_url:
                # Vision message with image
                content = [
                    {"type": "text", "text": m.content},
                    {"type": "image_url", "image_url": {"url": m.image_url}}
                ]
                formatted.append({"role": m.role, "content": content})
            else:
                formatted.append({"role": m.role, "content": m.content})
        return formatted

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> ChatResponse:
        response = await self.client.chat.completions.create(
            model=model,
            messages=self._format_messages(messages),
            **kwargs
        )
        choice = response.choices[0]
        return ChatResponse(
            content=choice.message.content,
            role="assistant",
            id=response.id,
            model=response.model,
            finish_reason=choice.finish_reason
        )

    async def stream_chat(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncGenerator[str, None]:
        stream = await self.client.chat.completions.create(
            model=model,
            messages=self._format_messages(messages),
            stream=True,
            **kwargs
        )
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def list_models(self) -> List[str]:
        models = await self.client.models.list()
        return [m.id for m in models.data if "gpt" in m.id]
