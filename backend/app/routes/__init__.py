# Initialize routes package
from fastapi import APIRouter
from . import auth, interview

router = APIRouter()
router.include_router(auth.router, prefix="/auth")
router.include_router(interview.router, prefix="/interview")
