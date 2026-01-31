from typing import AsyncGenerator, List
from openai import AsyncOpenAI
from .openai_p import OpenAIProvider
from ..models import ChatMessage, ChatResponse
import os

class VLLMProvider(OpenAIProvider):
    def __init__(self, api_key: str = "EMPTY", base_url: str = None):
        # Default to local vLLM or Ollama URL if not provided
        self.base_url = base_url or os.getenv("VLLM_BASE_URL", "http://localhost:8000/v1")
        self.api_key = api_key or os.getenv("VLLM_API_KEY", "EMPTY")
        self.client = AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
