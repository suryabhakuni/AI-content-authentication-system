from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os
import logging
import time
import base64
from typing import Optional, Dict, Any

from models.text_detector import TextDetector
from models.image_detector import ImageDetector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(
    title="AI Detection API",
    description="API for detecting AI-generated text and images",
    version="1.0.0"
)

cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:8080,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

text_detector = None
image_detector = None


class TextDetectionRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=10000, description="Text to analyze")


class ImageDetectionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded image data")


class DetectionResponse(BaseModel):
    is_ai_generated: bool
    confidence: float = Field(..., ge=0.0, le=1.0)
    processing_time: float
    model_name: str
    details: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    global text_detector, image_detector

    try:
        logger.info("Loading AI detection models...")
        text_detector = TextDetector()
        image_detector = ImageDetector()
        logger.info("All models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")


@app.get("/")
async def root():
    return {
        "message": "AI Detection API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "detect_text": "/api/detect/text",
            "detect_image": "/api/detect/image"
        }
    }


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "models": {
            "text": "loaded" if text_detector else "not_loaded",
            "image": "loaded" if image_detector else "not_loaded"
        },
        "version": "1.0.0"
    }


@app.post("/api/detect/text", response_model=DetectionResponse)
async def detect_text(request: TextDetectionRequest):
    if not text_detector:
        raise HTTPException(status_code=503, detail="Text detection model not loaded")

    start_time = time.time()

    try:
        if not request.text.strip():
            raise HTTPException(status_code=400, detail="Text cannot be empty")

        result = text_detector.detect(request.text)
        processing_time = time.time() - start_time

        if "error" in result and result["error"]:
            raise HTTPException(status_code=500, detail=result["error"])

        return DetectionResponse(
            is_ai_generated=result["is_ai_generated"],
            confidence=result["confidence"],
            processing_time=processing_time,
            model_name=result["model_name"]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in text detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detect/image", response_model=DetectionResponse)
async def detect_image(request: ImageDetectionRequest):
    if not image_detector:
        raise HTTPException(status_code=503, detail="Image detection model not loaded")

    start_time = time.time()

    try:
        try:
            if "," in request.image:
                image_data = request.image.split(",")[1]
            else:
                image_data = request.image

            image_bytes = base64.b64decode(image_data)

            if len(image_bytes) > 10 * 1024 * 1024:
                raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

        result = image_detector.detect(image_bytes)
        processing_time = time.time() - start_time

        if "error" in result and result["error"]:
            raise HTTPException(status_code=500, detail=result["error"])

        return DetectionResponse(
            is_ai_generated=result["is_ai_generated"],
            confidence=result["confidence"],
            processing_time=processing_time,
            model_name=result["model_name"],
            details=result.get("details")
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in image detection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    uvicorn.run(app, host=host, port=port)
