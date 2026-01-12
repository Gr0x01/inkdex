#!/usr/bin/env python3
"""
Local CLIP Embedding Server

A simple FastAPI server that generates CLIP embeddings using a local GPU.
Run this on any machine with a GPU to provide embedding generation.

Usage:
    python clip_server.py                    # Default port 5001
    python clip_server.py --port 5001        # Custom port
    python clip_server.py --host 0.0.0.0     # Listen on all interfaces

Requirements:
    pip install torch torchvision open-clip-torch fastapi uvicorn pillow

API Endpoints:
    GET  /health                     - Health check
    POST /generate_single_embedding  - Generate embedding from base64 image
    POST /generate_text_embedding    - Generate embedding from text query
"""

import argparse
import base64
import io
import os
import sys
import time
from typing import List, Optional

# Fix Windows console encoding
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except:
        pass

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Lazy-loaded model
model = None
preprocess = None
tokenizer = None
device = None


def load_model():
    """Load CLIP model on first request (lazy loading)"""
    global model, preprocess, tokenizer, device

    if model is not None:
        return

    import torch
    import open_clip

    print("Loading CLIP model...")
    start = time.time()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"  Device: {device}")

    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"  GPU: {gpu_name} ({gpu_memory:.1f} GB)")

    model, _, preprocess = open_clip.create_model_and_transforms(
        "ViT-L-14",
        pretrained="laion2b_s32b_b82k",
        device=device
    )
    model.eval()
    tokenizer = open_clip.get_tokenizer("ViT-L-14")

    elapsed = time.time() - start
    print(f"  Model loaded in {elapsed:.1f}s")


# FastAPI app
app = FastAPI(title="CLIP Embedding Server")


class ImageRequest(BaseModel):
    image_data: str  # base64 encoded


class TextRequest(BaseModel):
    text: str


@app.on_event("startup")
async def startup_event():
    """Pre-load model on startup"""
    load_model()


@app.get("/health")
def health_check():
    """Health check endpoint"""
    import torch

    gpu_available = torch.cuda.is_available()
    gpu_name = torch.cuda.get_device_name(0) if gpu_available else None

    return {
        "status": "ok",
        "gpu_available": gpu_available,
        "gpu_name": gpu_name,
        "model_loaded": model is not None,
        "device": device
    }


@app.post("/generate_single_embedding")
def generate_single_embedding(request: ImageRequest):
    """Generate CLIP embedding from base64-encoded image"""
    import torch
    from PIL import Image

    load_model()

    try:
        # Decode base64 image
        image_bytes = base64.b64decode(request.image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # Preprocess and generate embedding
        image_tensor = preprocess(image).unsqueeze(0).to(device)

        with torch.no_grad():
            embedding = model.encode_image(image_tensor)
            # Normalize (important for cosine similarity)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        return {"embedding": embedding}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_text_embedding")
def generate_text_embedding(request: TextRequest):
    """Generate CLIP embedding from text query"""
    import torch

    load_model()

    try:
        text_tokens = tokenizer([request.text]).to(device)

        with torch.no_grad():
            embedding = model.encode_text(text_tokens)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        return {"embedding": embedding}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Also support the text endpoint name used elsewhere
@app.post("/generate_text_query_embedding")
def generate_text_query_embedding(request: TextRequest):
    """Alias for generate_text_embedding"""
    return generate_text_embedding(request)


def main():
    parser = argparse.ArgumentParser(description="Local CLIP embedding server")
    parser.add_argument("--port", type=int, default=5001, help="Port to listen on (default: 5001)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)")
    parser.add_argument("--workers", type=int, default=4, help="Number of worker processes (default: 4)")
    args = parser.parse_args()

    print("=" * 60)
    print("CLIP EMBEDDING SERVER")
    print("=" * 60)
    print(f"Host: {args.host}")
    print(f"Port: {args.port}")
    print(f"Workers: {args.workers}")
    print(f"Health: http://{args.host}:{args.port}/health")
    print("=" * 60)

    uvicorn.run("clip_server:app", host=args.host, port=args.port, workers=args.workers)


if __name__ == "__main__":
    main()
