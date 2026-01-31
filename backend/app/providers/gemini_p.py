from typing import AsyncGenerator, List
from google import genai
from google.genai import types
from .base import BaseProvider
from ..models import ChatMessage, ChatResponse
import os
import base64
import asyncio

class GeminiProvider(BaseProvider):
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.client = genai.Client(api_key=self.api_key)

    def _format_contents(self, messages: List[ChatMessage]) -> List[types.Content]:
        """Format messages for Gemini API, handling images for vision models"""
        contents = []
        for m in messages:
            role = "user" if m.role == "user" else "model"
            parts = []
            
            # Add image part FIRST if present (Gemini prefers image before text)
            if m.image_url:
                try:
                    # Parse base64 data URL: data:image/jpeg;base64,/9j/4AAQ...
                    if m.image_url.startswith("data:"):
                        header, b64_data = m.image_url.split(",", 1)
                        mime_type = header.split(":")[1].split(";")[0]
                        image_bytes = base64.b64decode(b64_data)
                        parts.append(types.Part(inline_data=types.Blob(mime_type=mime_type, data=image_bytes)))
                        print(f"Added image part, mime_type: {mime_type}, size: {len(image_bytes)} bytes")
                except Exception as e:
                    print(f"Error parsing image: {e}")
            
            # Add text part
            if m.content:
                parts.append(types.Part(text=m.content))
            
            if parts:
                contents.append(types.Content(role=role, parts=parts))
        
        print(f"Formatted {len(contents)} content items for Gemini")
        return contents

    def _ensure_model_name(self, model: str) -> str:
        """Ensure model name has correct format"""
        # Don't add prefix if it already has it
        if model.startswith("models/"):
            return model
        return model  # New SDK might not need the prefix

    def _generate_stream(self, model_name: str, contents: list, config):
        """Synchronous generator for streaming"""
        try:
            response = self.client.models.generate_content_stream(
                model=model_name,
                contents=contents,
                config=config
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini stream generator error: {e}")
            yield f"Error: {str(e)}"

    async def chat(self, messages: List[ChatMessage], model: str, **kwargs) -> ChatResponse:
        contents = self._format_contents(messages)
        model_name = self._ensure_model_name(model)
        
        try:
            # Run sync call in thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=types.GenerateContentConfig(**kwargs) if kwargs else None
                )
            )
            
            return ChatResponse(
                content=response.text,
                role="assistant",
                model=model
            )
        except Exception as e:
            print(f"Gemini chat error: {e}")
            raise

    async def stream_chat(self, messages: List[ChatMessage], model: str, **kwargs) -> AsyncGenerator[str, None]:
        contents = self._format_contents(messages)
        model_name = self._ensure_model_name(model)
        config = types.GenerateContentConfig(**kwargs) if kwargs else None
        
        print(f"Starting Gemini stream_chat with model: {model_name}")
        
        # Run the synchronous stream in a thread pool
        loop = asyncio.get_event_loop()
        
        try:
            # Get all chunks first (since sync generator can't be easily made async)
            def get_full_response():
                try:
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config=config
                    )
                    return response.text
                except Exception as e:
                    print(f"Gemini generate error: {e}")
                    return f"Error: {str(e)}"
            
            full_text = await loop.run_in_executor(None, get_full_response)
            
            # Stream word by word for effect
            words = full_text.split(' ')
            for i, word in enumerate(words):
                if i > 0:
                    yield ' '
                yield word
                await asyncio.sleep(0.01)  # Small delay for streaming effect
                
        except Exception as e:
            print(f"Gemini stream error: {e}")
            yield f"Error: {str(e)}"

    async def list_models(self) -> List[str]:
        try:
            models = self.client.models.list()
            return [m.name.replace("models/", "") for m in models if "generateContent" in (m.supported_actions or [])]
        except Exception as e:
            print(f"Gemini list_models error: {e}")
            return ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"]
