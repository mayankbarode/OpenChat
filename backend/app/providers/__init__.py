from .openai_p import OpenAIProvider
from .anthropic_p import AnthropicProvider
from .gemini_p import GeminiProvider
from .vllm_p import VLLMProvider

def get_provider(name: str):
    providers = {
        "openai": OpenAIProvider,
        "anthropic": AnthropicProvider,
        "gemini": GeminiProvider,
        "vllm": VLLMProvider
    }
    return providers.get(name.lower())
