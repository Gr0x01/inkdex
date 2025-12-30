"""
Modal.com CLIP Embedding Generation for Tattoo Artist Discovery Platform

This script uses Modal.com's serverless GPU infrastructure to generate CLIP embeddings
for tattoo portfolio images using OpenCLIP ViT-L-14 (768 dimensions).

Architecture:
- Model: OpenCLIP ViT-L-14 (laion2b_s32b_b82k)
- GPU: A10G (on-demand, pay-per-second)
- Batch Size: 100 images per batch (configurable)
- Output: 768-dimensional embeddings stored in Supabase

Usage:
    modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 100
    modal run scripts/embeddings/modal_clip_embeddings.py::generate_single_embedding --image-url "https://..."
"""

import io
import os
from typing import List, Optional
import modal

# Modal app configuration
app = modal.App("tattoo-clip-embeddings")

# Container image with dependencies
image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "numpy<2",  # torch 2.1.2 requires numpy 1.x
        "open-clip-torch==2.24.0",
        "torch==2.1.2",
        "torchvision==0.16.2",
        "Pillow==10.2.0",
        "requests==2.31.0",
        "supabase==2.15.0",  # Newer version compatible with httpx
        "fastapi[standard]==0.115.0",  # Required for web endpoints
    )
)

# Secrets for Supabase (set via `modal secret create supabase`)
# You'll need to run: modal secret create supabase SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...


@app.cls(
    gpu="A10G",  # Single A10G GPU (~$0.60/hour, billed per second)
    image=image,
    secrets=[modal.Secret.from_name("supabase")],
    timeout=7200,  # 2 hour max for full batch processing
)
class CLIPEmbedder:
    """CLIP embedding generator using OpenCLIP ViT-L-14"""

    @modal.enter()
    def enter(self):
        """Initialize model on GPU (runs once per container)"""
        import torch
        import open_clip
        from supabase import create_client

        # Initialize CLIP model on GPU
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔥 Using device: {self.device}")

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-L-14",
            pretrained="laion2b_s32b_b82k",
            device=self.device
        )
        self.model.eval()  # Set to evaluation mode

        # Initialize Supabase client with validation
        try:
            supabase_url = os.environ["SUPABASE_URL"]
            supabase_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
        except KeyError:
            print("❌ Missing required Modal secret (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)")
            print("💡 Run: modal secret create supabase SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...")
            raise RuntimeError("Missing Supabase credentials") from None

        # Validate credentials format
        if not supabase_url.startswith("https://"):
            raise ValueError("Invalid Supabase URL format (must start with https://)")

        if len(supabase_key) < 32:
            raise ValueError("Invalid service role key format (too short)")

        # Initialize Supabase client
        self.supabase = create_client(supabase_url, supabase_key)
        print(f"✅ Model loaded on GPU and Supabase client initialized")

    @modal.method()
    def generate_embedding(self, image_url: str) -> List[float]:
        """
        Generate CLIP embedding for a single image URL

        Args:
            image_url: HTTP(S) URL to image

        Returns:
            768-dimensional embedding as list of floats
        """
        import torch
        import requests
        from PIL import Image
        import urllib.parse
        import socket

        # Security: Validate URL to prevent SSRF attacks
        MAX_IMAGE_SIZE_MB = 20  # 20MB max
        ALLOWED_SCHEMES = {"https"}  # Only HTTPS
        BLOCKED_IPS = {
            "127.0.0.1", "localhost", "0.0.0.0",
            "169.254.169.254",  # AWS metadata
            "::1",  # IPv6 localhost
        }

        # 1. Validate URL format
        try:
            parsed = urllib.parse.urlparse(image_url)
        except Exception:
            raise ValueError("Invalid URL format")

        # 2. Check scheme is HTTPS only
        if parsed.scheme not in ALLOWED_SCHEMES:
            raise ValueError(f"Invalid URL scheme: {parsed.scheme}. Only HTTPS allowed.")

        # 3. Resolve hostname and block private IPs
        try:
            hostname = parsed.hostname
            if not hostname:
                raise ValueError("Missing hostname in URL")

            # Resolve DNS
            ip_addr = socket.gethostbyname(hostname)

            # Block localhost and private IPs (RFC 1918)
            if (ip_addr in BLOCKED_IPS or
                ip_addr.startswith("10.") or
                ip_addr.startswith("172.16.") or
                ip_addr.startswith("192.168.")):
                raise ValueError("Private IP address not allowed")
        except socket.gaierror:
            raise ValueError("Cannot resolve hostname")
        except ValueError:
            raise

        # 4. Download with size limit (streaming to prevent memory exhaustion)
        try:
            response = requests.get(
                image_url,
                timeout=10,
                stream=True,
                headers={"User-Agent": "TattooDiscoveryBot/1.0"}
            )
            response.raise_for_status()

            # Check content length header
            content_length = response.headers.get('content-length')
            if content_length and int(content_length) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
                raise ValueError(f"Image too large: {content_length} bytes (max {MAX_IMAGE_SIZE_MB}MB)")

            # Download with size limit enforcement
            image_data = io.BytesIO()
            downloaded = 0
            for chunk in response.iter_content(chunk_size=8192):
                downloaded += len(chunk)
                if downloaded > MAX_IMAGE_SIZE_MB * 1024 * 1024:
                    raise ValueError(f"Image exceeds size limit ({MAX_IMAGE_SIZE_MB}MB)")
                image_data.write(chunk)

            image_data.seek(0)

            # 5. Safely parse image
            image = Image.open(image_data)

            # Validate image dimensions (prevent decompression bombs)
            width, height = image.size
            if width * height > 100_000_000:  # 100 megapixels max
                raise ValueError(f"Image too large: {width}x{height} pixels")

            image = image.convert("RGB")

        except requests.RequestException as e:
            raise ValueError(f"Failed to download image: {str(e)}")
        except Exception as e:
            raise ValueError(f"Failed to process image: {str(e)}")

        # Preprocess and generate embedding
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            embedding = self.model.encode_image(image_tensor)
            # Normalize embedding (important for cosine similarity)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        # Verify normalization (L2 norm should be ~1.0)
        norm = sum(x**2 for x in embedding) ** 0.5
        if abs(norm - 1.0) > 0.01:
            raise ValueError(f"Embedding not properly normalized: L2 norm = {norm}")

        return embedding

    @modal.method()
    def generate_text_embedding(self, text: str) -> List[float]:
        """
        Generate CLIP embedding for text query

        Args:
            text: Text query (e.g., "fine line floral tattoo")

        Returns:
            768-dimensional embedding as list of floats
        """
        import torch
        import open_clip

        # Tokenize text
        tokenizer = open_clip.get_tokenizer("ViT-L-14")
        text_tokens = tokenizer([text]).to(self.device)

        # Generate embedding
        with torch.no_grad():
            embedding = self.model.encode_text(text_tokens)
            # Normalize embedding
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        return embedding

    @modal.method()
    def process_batch_from_db(
        self,
        batch_size: int = 100,
        offset: int = 0,
        city: Optional[str] = None
    ) -> dict:
        """
        Fetch images from Supabase and generate embeddings in batch

        Args:
            batch_size: Number of images to process
            offset: Offset for pagination
            city: Optional city filter (e.g., "Austin, TX")

        Returns:
            Dict with processed count, errors, etc.
        """
        import torch
        from PIL import Image
        import requests
        import traceback

        # Fetch images from Supabase that don't have embeddings yet
        # Only fetch images with status='pending' to avoid race conditions
        query = self.supabase.table("portfolio_images").select(
            "id, storage_original_path, artist_id"
        ).is_("embedding", "null").eq("status", "pending").limit(batch_size).offset(offset)

        # Optional city filter (join with artists table)
        if city:
            query = query.eq("artists.city", city)

        response = query.execute()
        images = response.data

        if not images:
            return {
                "processed": 0,
                "errors": 0,
                "message": "No images to process (all done or in progress)"
            }

        print(f"📸 Processing {len(images)} images (offset: {offset})")

        # Process all embeddings first (collect results before DB updates)
        results = []
        errors = []

        for img_data in images:
            try:
                # Construct public URL from storage path
                storage_path = img_data["storage_original_path"]
                supabase_url = os.environ["SUPABASE_URL"]
                public_url = f"{supabase_url}/storage/v1/object/public/portfolio-images/{storage_path}"

                # Generate embedding
                embedding = self.generate_embedding.local(public_url)

                results.append({
                    "id": img_data["id"],
                    "embedding": embedding,
                    "status": "active"  # Mark as active once embedding is generated
                })

            except Exception as e:
                error_info = {
                    "image_id": img_data["id"],
                    "storage_path": img_data["storage_original_path"],
                    "error_type": type(e).__name__,
                    "error_message": str(e),
                    "traceback": traceback.format_exc()[-500:]  # Last 500 chars
                }
                errors.append(error_info)

                print(f"  ✗ Error processing image {img_data['id']} [{type(e).__name__}]: {e}")

                # Mark as failed
                results.append({
                    "id": img_data["id"],
                    "status": "failed"
                })

        # Batch update database (atomic per record)
        successful_updates = 0
        failed_updates = 0

        for result in results:
            try:
                self.supabase.table("portfolio_images").update(result).eq("id", result["id"]).execute()
                successful_updates += 1

                if successful_updates % 10 == 0:
                    print(f"  ✓ Stored {successful_updates}/{len(results)} embeddings")

            except Exception as e:
                failed_updates += 1
                print(f"  ✗ DB update failed for {result['id']}: {type(e).__name__}")
                errors.append({
                    "image_id": result["id"],
                    "error_type": "DatabaseUpdateError",
                    "error_message": f"Failed to store embedding: {str(e)}"
                })

        processed_count = len([r for r in results if r.get("status") == "active"])

        return {
            "processed": processed_count,
            "errors": len(errors),
            "total": len(images),
            "successful_updates": successful_updates,
            "failed_updates": failed_updates,
            "error_details": errors[:10],  # First 10 errors
            "offset": offset,
            "batch_size": batch_size
        }


# Standalone functions for CLI usage

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase")],
)
def generate_embeddings_batch(
    batch_size: int = 100,
    offset: int = 0,
    city: Optional[str] = None,
    max_batches: int = 100
):
    """
    Process all images in batches

    Usage:
        modal run scripts/embeddings/modal_clip_embeddings.py::generate_embeddings_batch --batch-size 100 --city "Austin, TX"
    """
    embedder = CLIPEmbedder()

    total_processed = 0
    total_errors = 0
    batch_num = 0

    print(f"🚀 Starting batch embedding generation")
    print(f"   Batch size: {batch_size}")
    print(f"   Starting offset: {offset}")
    if city:
        print(f"   City filter: {city}")
    print()

    while batch_num < max_batches:
        batch_offset = offset + (batch_num * batch_size)

        result = embedder.process_batch_from_db.remote(
            batch_size=batch_size,
            offset=batch_offset,
            city=city
        )

        if result["processed"] == 0:
            print("✅ All images processed!")
            break

        total_processed += result["processed"]
        total_errors += result["errors"]
        batch_num += 1

        print(f"\n📊 Batch {batch_num} complete:")
        print(f"   Processed: {result['processed']}")
        print(f"   Errors: {result['errors']}")
        print(f"   Running total: {total_processed} processed, {total_errors} errors")
        print()

    print(f"\n🎉 Embedding generation complete!")
    print(f"   Total processed: {total_processed}")
    print(f"   Total errors: {total_errors}")
    if total_processed + total_errors > 0:
        print(f"   Success rate: {(total_processed / (total_processed + total_errors) * 100):.1f}%")


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase")],
)
def generate_single_embedding(image_url: str):
    """
    Generate embedding for a single image (testing)

    Usage:
        modal run scripts/embeddings/modal_clip_embeddings.py::generate_single_embedding --image-url "https://..."
    """
    embedder = CLIPEmbedder()

    print(f"🔍 Generating embedding for: {image_url}")
    embedding = embedder.generate_embedding.remote(image_url)

    print(f"✅ Generated {len(embedding)}-dimensional embedding")
    print(f"📊 First 5 values: {embedding[:5]}")
    print(f"📊 Embedding norm: {sum(x**2 for x in embedding)**0.5:.4f}")

    return embedding


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("supabase")],
)
def generate_text_query_embedding(text: str):
    """
    Generate embedding for a text query (for search)

    Usage:
        modal run scripts/embeddings/modal_clip_embeddings.py::generate_text_query_embedding --text "fine line floral tattoo"
    """
    embedder = CLIPEmbedder()

    print(f"🔍 Generating text embedding for: '{text}'")
    embedding = embedder.generate_text_embedding.remote(text)

    print(f"✅ Generated {len(embedding)}-dimensional embedding")
    print(f"📊 First 5 values: {embedding[:5]}")

    return embedding


# Expose FastAPI app via Modal with persistent model
@app.cls(
    gpu="A10G",
    image=image,
    secrets=[modal.Secret.from_name("supabase")],
    scaledown_window=600,  # Keep container alive for 10 minutes after last request (Modal 1.0+)
    # No keep_warm - only pay when actively used, not 24/7
)
class Model:
    @modal.enter()
    def load_model(self):
        """Load model once when container starts (cached across requests)"""
        import torch
        import open_clip

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"🔥 Loading CLIP model on {self.device}...")

        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            "ViT-L-14",
            pretrained="laion2b_s32b_b82k",
            device=self.device
        )
        self.model.eval()
        self.tokenizer = open_clip.get_tokenizer("ViT-L-14")

        print("✅ Model loaded and ready")

    @modal.method()
    def generate_image_embedding_from_bytes(self, image_data: bytes) -> List[float]:
        """Generate embedding from image bytes"""
        import torch
        from PIL import Image
        import io

        image = Image.open(io.BytesIO(image_data)).convert("RGB")
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

        with torch.no_grad():
            embedding = self.model.encode_image(image_tensor)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        return embedding

    @modal.method()
    def generate_text_embedding_from_string(self, text: str) -> List[float]:
        """Generate embedding from text string"""
        import torch

        text_tokens = self.tokenizer([text]).to(self.device)

        with torch.no_grad():
            embedding = self.model.encode_text(text_tokens)
            embedding = embedding / embedding.norm(dim=-1, keepdim=True)
            embedding = embedding.cpu().numpy()[0].tolist()

        return embedding

    @modal.asgi_app()
    def fastapi_app(self):
        from fastapi import FastAPI, HTTPException
        from pydantic import BaseModel
        import base64

        web_app = FastAPI()

        class ImageRequest(BaseModel):
            image_data: str  # base64 encoded

        class TextRequest(BaseModel):
            text: str

        @web_app.post("/generate_single_embedding")
        def api_generate_single_embedding(request: ImageRequest):
            """
            Web endpoint for generating single image embedding via HTTP POST

            Request body: {"image_data": "base64_encoded_image"}
            Response: {"embedding": [768 floats]}
            """
            try:
                # Decode base64 image
                image_bytes = base64.b64decode(request.image_data)

                # Use cached model (no .remote() call - already in same container)
                embedding = self.generate_image_embedding_from_bytes.local(image_bytes)

                return {"embedding": embedding}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        @web_app.post("/generate_text_query_embedding")
        def api_generate_text_query_embedding(request: TextRequest):
            """
            Web endpoint for generating text query embedding via HTTP POST

            Request body: {"text": "tattoo style description"}
            Response: {"embedding": [768 floats]}
            """
            try:
                # Use cached model (no .remote() call - already in same container)
                embedding = self.generate_text_embedding_from_string.local(request.text)

                return {"embedding": embedding}
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))

        return web_app


# Local testing function (runs without Modal)
@app.local_entrypoint()
def main():
    """Test the embedding generation locally"""
    # Test with a sample tattoo image
    test_image_url = "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=800"

    print("🧪 Testing CLIP embedding generation...")
    print(f"📸 Test image: {test_image_url}")
    print()

    embedding = generate_single_embedding.remote(test_image_url)

    print(f"\n✅ Test successful! Generated {len(embedding)}-dim embedding")
