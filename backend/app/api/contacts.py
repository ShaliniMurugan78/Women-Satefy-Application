from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.models import User, EmergencyContact
from backend.app.schemas.schemas import ContactCreate, ContactUpdate, ContactResponse
from backend.app.security.auth import get_current_user

router = APIRouter(prefix="/contacts", tags=["Emergency Contacts"])

@router.get("", response_model=List[ContactResponse])
def get_contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contacts = db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).all()
    return contacts

@router.post("", response_model=ContactResponse)
def create_contact(contact_in: ContactCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # If primary is set, clear other primary contacts
    if contact_in.is_primary:
        db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).update({"is_primary": False})
    
    contact = EmergencyContact(
        user_id=current_user.id,
        name=contact_in.name,
        phone=contact_in.phone,
        relationship=contact_in.relationship or "Family",
        is_primary=bool(contact_in.is_primary),
        is_secondary=bool(contact_in.is_secondary),
        is_verified=True
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact

@router.put("/{contact_id}", response_model=ContactResponse)
def update_contact(contact_id: int, contact_in: ContactUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    if contact_in.is_primary:
        db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).update({"is_primary": False})

    update_data = contact_in.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    db.commit()
    db.refresh(contact)
    return contact

@router.delete("/{contact_id}")
def delete_contact(contact_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id
    ).first()
    if not contact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")

    db.delete(contact)
    db.commit()
    return {"status": "success", "message": "Emergency contact removed"}
