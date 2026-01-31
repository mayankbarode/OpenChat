from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from ..core.security import decode_access_token
from ..database.models import User
from beanie import PydanticObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        print(f"Token decoding failed for token: {token[:10]}...")
        raise credentials_exception
    
    user_id: str = payload.get("sub")
    if user_id is None:
        print("No 'sub' in token payload")
        raise credentials_exception
        
    user = await User.get(user_id)
    if user is None:
        print(f"User not found in DB for ID: {user_id}")
        raise credentials_exception
        
    return user
