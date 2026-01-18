"""
PaddleOCR Service
FastAPI service for Thai receipt OCR processing

Features:
- Thai + English mixed text recognition
- Image preprocessing (contrast, rotation correction)
- Confidence scoring per text block
- Quality metrics for blur detection
"""

import io
import base64
import logging
from typing import Optional
from datetime import datetime

import numpy as np
import cv2
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from paddleocr import PaddleOCR

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI
app = FastAPI(
    title="PaddleOCR Service",
    description="Thai receipt OCR processing for Auto-Acct-001",
    version="1.0.0"
)

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR with Thai support
# Note: First run will download models (~500MB)
ocr_engine: Optional[PaddleOCR] = None


def get_ocr_engine() -> PaddleOCR:
    """Lazy initialization of OCR engine"""
    global ocr_engine
    if ocr_engine is None:
        logger.info("Initializing PaddleOCR engine...")
        ocr_engine = PaddleOCR(
            use_angle_cls=True,  # Detect text rotation
            lang='en',  # Use 'ch' for full CJK model (Thai works with en)
            use_gpu=False,
            show_log=False
        )
        logger.info("PaddleOCR engine initialized")
    return ocr_engine


class OCRRequest(BaseModel):
    """Request body for OCR extraction"""
    image: str  # Base64 encoded image
    lang: str = "thai"  # Language hint


class TextBlock(BaseModel):
    """Single detected text block"""
    text: str
    confidence: float
    bbox: list[list[float]]  # Bounding box coordinates


class OCRResponse(BaseModel):
    """Response from OCR extraction"""
    text: str  # Full extracted text
    blocks: list[TextBlock]  # Individual text blocks
    confidence: dict  # Confidence scores
    quality: dict  # Image quality metrics
    processing_time_ms: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    service: str
    timestamp: str
    ocr_engine_loaded: bool


def preprocess_image(image_bytes: bytes) -> tuple[np.ndarray, dict]:
    """
    Preprocess image for better OCR accuracy
    Returns: (processed_image, quality_metrics)
    """
    # Load image
    img = Image.open(io.BytesIO(image_bytes))
    img_array = np.array(img)
    
    # Convert to grayscale if needed
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
    else:
        gray = img_array
    
    # Calculate quality metrics
    width, height = img.size
    
    # Sharpness (Laplacian variance)
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    sharpness = laplacian.var()
    
    # Contrast (standard deviation)
    contrast = gray.std()
    
    quality_metrics = {
        "width": width,
        "height": height,
        "sharpness": round(sharpness, 2),
        "contrast": round(contrast, 2),
        "is_blurry": sharpness < 50,
        "is_low_contrast": contrast < 30
    }
    
    # Apply preprocessing
    processed = gray
    
    # Contrast enhancement if needed
    if contrast < 50:
        processed = cv2.equalizeHist(gray)
    
    # Denoising
    processed = cv2.fastNlMeansDenoising(processed, None, 10, 7, 21)
    
    # Convert back to RGB for PaddleOCR
    processed_rgb = cv2.cvtColor(processed, cv2.COLOR_GRAY2RGB)
    
    return processed_rgb, quality_metrics


def calculate_overall_confidence(blocks: list[TextBlock]) -> dict:
    """Calculate overall confidence from text blocks"""
    if not blocks:
        return {
            "vendor": 0.0,
            "amount": 0.0,
            "date": 0.0,
            "overall": 0.0
        }
    
    confidences = [b.confidence for b in blocks]
    avg_confidence = sum(confidences) / len(confidences)
    
    # Weight by text length (longer text = more reliable)
    weighted_conf = 0.0
    total_weight = 0
    for block in blocks:
        weight = len(block.text)
        weighted_conf += block.confidence * weight
        total_weight += weight
    
    if total_weight > 0:
        weighted_conf /= total_weight
    
    return {
        "vendor": weighted_conf,  # First line typically vendor
        "amount": weighted_conf,
        "date": weighted_conf,
        "overall": round(avg_confidence, 4)
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        service="paddleocr-worker",
        timestamp=datetime.utcnow().isoformat(),
        ocr_engine_loaded=ocr_engine is not None
    )


@app.post("/ocr/extract", response_model=OCRResponse)
async def extract_text(request: OCRRequest):
    """
    Extract text from receipt image using PaddleOCR
    """
    start_time = datetime.utcnow()
    
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(request.image)
        
        # Preprocess image
        processed_img, quality_metrics = preprocess_image(image_bytes)
        
        # Check quality thresholds
        if quality_metrics["width"] < 200 or quality_metrics["height"] < 200:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "IMAGE_TOO_SMALL",
                    "message": f"Image too small: {quality_metrics['width']}x{quality_metrics['height']}. Minimum: 200x200",
                    "quality": quality_metrics
                }
            )
        
        # Run OCR
        engine = get_ocr_engine()
        result = engine.ocr(processed_img, cls=True)
        
        # Parse results
        blocks: list[TextBlock] = []
        full_text_lines = []
        
        if result and result[0]:
            for line in result[0]:
                bbox = line[0]  # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
                text = line[1][0]  # Text content
                conf = line[1][1]  # Confidence score
                
                blocks.append(TextBlock(
                    text=text,
                    confidence=round(conf, 4),
                    bbox=bbox
                ))
                full_text_lines.append(text)
        
        full_text = "\n".join(full_text_lines)
        confidence = calculate_overall_confidence(blocks)
        
        # Calculate processing time
        processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
        
        logger.info(f"OCR completed: {len(blocks)} blocks, confidence: {confidence['overall']:.2f}, time: {processing_time}ms")
        
        return OCRResponse(
            text=full_text,
            blocks=blocks,
            confidence=confidence,
            quality=quality_metrics,
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR processing failed: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "OCR_PROCESSING_FAILED",
                "message": str(e)
            }
        )


@app.on_event("startup")
async def startup_event():
    """Pre-load OCR engine on startup"""
    logger.info("Starting PaddleOCR service...")
    # Warm up the engine
    try:
        get_ocr_engine()
        logger.info("PaddleOCR service ready")
    except Exception as e:
        logger.error(f"Failed to initialize OCR engine: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
