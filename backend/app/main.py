import datetime
import json
import os
from typing import Optional, List, Dict, Any

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .models import ChatMessage, ChatResponse, ChatRequest, SettingsUpdate
from .providers import get_provider
from .database.init import init_db
from .database.models import User, Conversation
from .api.auth import router as auth_router
from .api.deps import get_current_user

app = FastAPI(title="OpenChatLLM API")

@app.on_event("startup")
async def on_startup():
    await init_db()

app.include_router(auth_router)


@app.get("/user/settings")
async def get_user_settings(current_user: User = Depends(get_current_user)):
    return {
        "api_keys": current_user.api_keys,
        "base_urls": current_user.base_urls,
        "selected_provider": current_user.selected_provider,
        "selected_model": current_user.selected_model
    }

@app.patch("/user/settings")
async def update_user_settings(settings: SettingsUpdate, current_user: User = Depends(get_current_user)):
    print(f"Updating settings for user {current_user.username}: {settings}")
    if settings.api_keys is not None:
        current_user.api_keys = {**current_user.api_keys, **settings.api_keys}
    if settings.base_urls is not None:
        current_user.base_urls = {**current_user.base_urls, **settings.base_urls}
    if settings.selected_provider is not None:
        current_user.selected_provider = settings.selected_provider
    if settings.selected_model is not None:
        current_user.selected_model = settings.selected_model
    
    await current_user.save()
    print(f"Settings saved for {current_user.username}")
    return {"message": "Settings updated successfully"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "OpenChatLLM API is running on MongoDB"}

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    provider_class = get_provider(request.provider)
    if not provider_class:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    if request.provider == "vllm":
        provider = provider_class(api_key=request.apiKey, base_url=request.baseUrl)
    else:
        provider = provider_class(api_key=request.apiKey)
        
    try:
        return await provider.chat(request.messages, request.model, **(request.parameters or {}))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/stream")
async def chat_stream_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    provider_class = get_provider(request.provider)
    if not provider_class:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    if request.provider == "vllm":
        provider = provider_class(api_key=request.apiKey, base_url=request.baseUrl)
    else:
        provider = provider_class(api_key=request.apiKey)
    
    async def event_generator():
        # Find or create conversation in MongoDB
        if request.conversationId:
            conv = await Conversation.get(request.conversationId)
            if not conv or conv.user_id != str(current_user.id):
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            conv = Conversation(
                user_id=str(current_user.id),
                title=request.messages[-1].content[:50],
                messages=[]
            )
            await conv.insert()
        
        # Save user message (include image if present)
        last_msg = request.messages[-1]
        user_msg = {
            "role": "user", 
            "content": last_msg.content, 
            "timestamp": datetime.datetime.utcnow()
        }
        if last_msg.image_url:
            user_msg["image_url"] = last_msg.image_url
        conv.messages.append(user_msg)
        await conv.save()

        # Send conversation ID to frontend
        yield f"data: {json.dumps({'conversationId': str(conv.id)})}\n\n"

        try:
            bot_content = ""
            # Debug: log if there's an image in the message
            for msg in request.messages:
                if msg.image_url:
                    print(f"Processing message with image, content: {msg.content[:50] if msg.content else 'No text'}")
            async for chunk in provider.stream_chat(request.messages, request.model, **(request.parameters or {})):
                bot_content += chunk
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            # Save assistant message
            assistant_msg = {"role": "assistant", "content": bot_content, "timestamp": datetime.datetime.utcnow()}
            conv.messages.append(assistant_msg)
            conv.updated_at = datetime.datetime.utcnow()
            await conv.save()

            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/models")
async def list_models_endpoint(provider: str, apiKey: Optional[str] = None, baseUrl: Optional[str] = None):
    provider_class = get_provider(provider)
    if not provider_class:
        raise HTTPException(status_code=400, detail="Unsupported provider")
    
    if provider == "vllm":
        provider_instance = provider_class(api_key=apiKey, base_url=baseUrl)
    else:
        provider_instance = provider_class(api_key=apiKey)
    
    try:
        models = await provider_instance.list_models()
        return {"models": models}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    conversations = await Conversation.find(Conversation.user_id == str(current_user.id)).sort("-updated_at").to_list()
    # Serialize with string IDs
    return [
        {
            "id": str(conv.id),
            "title": conv.title,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
            "created_at": conv.created_at.isoformat() if conv.created_at else None
        }
        for conv in conversations
    ]

@app.get("/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    conversation = await Conversation.get(conversation_id)
    if not conversation or conversation.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    # Return full conversation with messages
    return {
        "id": str(conversation.id),
        "title": conversation.title,
        "messages": conversation.messages,
        "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None
    }

@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    conversation = await Conversation.get(conversation_id)
    if not conversation or conversation.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    await conversation.delete()
    return {"message": "Deleted successfully"}

@app.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, title: str, current_user: User = Depends(get_current_user)):
    conversation = await Conversation.get(conversation_id)
    if not conversation or conversation.user_id != str(current_user.id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    conversation.title = title
    await conversation.save()
    return conversation

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
