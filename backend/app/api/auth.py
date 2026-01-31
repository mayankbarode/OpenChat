from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from ..database.models import User
from ..core.security import get_password_hash, verify_password, create_access_token
from ..api.deps import get_current_user
from pydantic import BaseModel, EmailStr
from typing import Optional

router = APIRouter(prefix="/auth", tags=["auth"])

@router.get("/check-username/{username}")
async def check_username(username: str):
    """Check if username is available"""
    existing = await User.find_one(User.username == username)
    return {"available": existing is None, "username": username}

class UserSignup(BaseModel):
    username: str  # Required
    email: Optional[EmailStr] = None  # Optional
    password: str  # Required

class Token(BaseModel):
    access_token: str
    token_type: str
    username: str

@router.post("/signup", response_model=Token)
async def signup(user_in: UserSignup):
    # Check if username already exists
    existing = await User.find_one(User.username == user_in.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Check if email already exists (if provided)
    if user_in.email:
        existing_email = await User.find_one(User.email == user_in.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    new_user = User(
        email=user_in.email or f"{user_in.username}@local",
        username=user_in.username,
        hashed_password=get_password_hash(user_in.password)
    )
    await new_user.insert()
    
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "username": new_user.username}

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Login using username (not email)
    user = await User.find_one(User.username == form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user)
):
    # Verify current password
    if not verify_password(request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(request.new_password)
    await current_user.save()
    
    return {"message": "Password changed successfully"}
