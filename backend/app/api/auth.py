from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from backend.app.database.session import get_db
from backend.app.models.models import User, UserPreference, HeartRateBaseline, EmergencyContact
from backend.app.schemas.schemas import UserRegister, UserLogin, UserResponse, Token
from backend.app.security.auth import get_password_hash, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    user = User(
        email=user_in.email.lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default preferences & baseline
    pref = UserPreference(user_id=user.id)
    baseline = HeartRateBaseline(user_id=user.id)
    db.add(pref)
    db.add(baseline)
    db.commit()

    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    token_data = {"sub": str(user.id), "email": user.email}
    access_token = create_access_token(token_data)

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
