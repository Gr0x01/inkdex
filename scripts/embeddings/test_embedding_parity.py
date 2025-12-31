#!/usr/bin/env python3
"""
Embedding Parity Test

Verifies that local GPU and Modal.com produce identical CLIP embeddings.
This is critical to ensure seamless failover without affecting search quality.

Usage:
    python scripts/embeddings/test_embedding_parity.py
    python scripts/embeddings/test_embedding_parity.py --image path/to/test.jpg
    python scripts/embeddings/test_embedding_parity.py --text "fine line floral tattoo"

Requirements:
    - Both LOCAL_CLIP_URL and MODAL_FUNCTION_URL must be configured
    - Test image file in current directory (or specify with --image)
"""

import requests
import numpy as np
import base64
import sys
import os
import argparse
from pathlib import Path

# Configuration
LOCAL_CLIP_URL = os.getenv("LOCAL_CLIP_URL", "https://clip.inkdex.io")
CLIP_API_KEY = os.getenv("CLIP_API_KEY")
MODAL_FUNCTION_URL = os.getenv("MODAL_FUNCTION_URL")

# Thresholds
SIMILARITY_THRESHOLD = 0.99  # Embeddings should be >99% similar
NORM_TOLERANCE = 0.01  # L2 norm should be ~1.0 ± 0.01

def load_test_image(image_path: str) -> str:
    """Load image and convert to base64"""
    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
            return base64.b64encode(image_bytes).decode()
    except FileNotFoundError:
        print(f"❌ Error: Image file not found: {image_path}")
        sys.exit(1)

def test_image_embedding_parity(image_base64: str) -> bool:
    """Test image embedding parity between local and Modal"""
    print("\n" + "="*60)
    print("IMAGE EMBEDDING PARITY TEST")
    print("="*60)

    # Test local GPU
    print("\n1️⃣  Calling local GPU...")
    try:
        headers = {}
        if CLIP_API_KEY:
            headers['Authorization'] = f'Bearer {CLIP_API_KEY}'

        local_response = requests.post(
            f"{LOCAL_CLIP_URL}/generate_single_embedding",
            json={"image_data": image_base64},
            headers=headers,
            timeout=10
        )
        local_response.raise_for_status()
        local_data = local_response.json()
        local_embedding = np.array(local_data["embedding"])

        print(f"   ✅ Local embedding shape: {local_embedding.shape}")
        local_norm = np.linalg.norm(local_embedding)
        print(f"   ✅ Local L2 norm: {local_norm:.6f}")

        if abs(local_norm - 1.0) > NORM_TOLERANCE:
            print(f"   ⚠️  Warning: L2 norm should be ~1.0, got {local_norm:.6f}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Local GPU failed: {e}")
        return False

    # Test Modal
    print("\n2️⃣  Calling Modal.com...")
    if not MODAL_FUNCTION_URL:
        print("   ❌ MODAL_FUNCTION_URL not configured")
        return False

    try:
        modal_response = requests.post(
            f"{MODAL_FUNCTION_URL}/generate_single_embedding",
            json={"image_data": image_base64},
            timeout=30
        )
        modal_response.raise_for_status()
        modal_data = modal_response.json()
        modal_embedding = np.array(modal_data["embedding"])

        print(f"   ✅ Modal embedding shape: {modal_embedding.shape}")
        modal_norm = np.linalg.norm(modal_embedding)
        print(f"   ✅ Modal L2 norm: {modal_norm:.6f}")

        if abs(modal_norm - 1.0) > NORM_TOLERANCE:
            print(f"   ⚠️  Warning: L2 norm should be ~1.0, got {modal_norm:.6f}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Modal failed: {e}")
        return False

    # Compare embeddings
    print("\n3️⃣  Comparing embeddings...")

    # Cosine similarity (embeddings should already be L2 normalized)
    cosine_sim = np.dot(local_embedding, modal_embedding)
    print(f"   Cosine similarity: {cosine_sim:.8f}")

    # Euclidean distance (should be small if embeddings are similar)
    euclidean_dist = np.linalg.norm(local_embedding - modal_embedding)
    print(f"   Euclidean distance: {euclidean_dist:.8f}")

    # Element-wise difference statistics
    diff = np.abs(local_embedding - modal_embedding)
    print(f"   Max element diff: {diff.max():.8f}")
    print(f"   Mean element diff: {diff.mean():.8f}")

    # Pass/Fail
    if cosine_sim > SIMILARITY_THRESHOLD:
        print(f"\n✅ PASS: Embeddings are identical! (similarity: {cosine_sim:.8f})")
        return True
    else:
        print(f"\n❌ FAIL: Embeddings differ too much (similarity: {cosine_sim:.8f})")
        print("\nPossible issues:")
        print("  - Different CLIP models (must both use ViT-L-14)")
        print("  - Different pretrained weights (must both use laion2b_s32b_b82k)")
        print("  - Missing L2 normalization on one service")
        print("  - Different preprocessing (image resize, normalization)")
        return False

def test_text_embedding_parity(text: str) -> bool:
    """Test text embedding parity between local and Modal"""
    print("\n" + "="*60)
    print("TEXT EMBEDDING PARITY TEST")
    print("="*60)
    print(f"\nQuery text: \"{text}\"")

    # Test local GPU
    print("\n1️⃣  Calling local GPU...")
    try:
        headers = {}
        if CLIP_API_KEY:
            headers['Authorization'] = f'Bearer {CLIP_API_KEY}'

        local_response = requests.post(
            f"{LOCAL_CLIP_URL}/generate_text_query_embedding",
            json={"text": text},
            headers=headers,
            timeout=10
        )
        local_response.raise_for_status()
        local_data = local_response.json()
        local_embedding = np.array(local_data["embedding"])

        print(f"   ✅ Local embedding shape: {local_embedding.shape}")
        local_norm = np.linalg.norm(local_embedding)
        print(f"   ✅ Local L2 norm: {local_norm:.6f}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Local GPU failed: {e}")
        return False

    # Test Modal
    print("\n2️⃣  Calling Modal.com...")
    if not MODAL_FUNCTION_URL:
        print("   ❌ MODAL_FUNCTION_URL not configured")
        return False

    try:
        modal_response = requests.post(
            f"{MODAL_FUNCTION_URL}/generate_text_query_embedding",
            json={"text": text},
            timeout=30
        )
        modal_response.raise_for_status()
        modal_data = modal_response.json()
        modal_embedding = np.array(modal_data["embedding"])

        print(f"   ✅ Modal embedding shape: {modal_embedding.shape}")
        modal_norm = np.linalg.norm(modal_embedding)
        print(f"   ✅ Modal L2 norm: {modal_norm:.6f}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Modal failed: {e}")
        return False

    # Compare
    print("\n3️⃣  Comparing embeddings...")
    cosine_sim = np.dot(local_embedding, modal_embedding)
    print(f"   Cosine similarity: {cosine_sim:.8f}")

    if cosine_sim > SIMILARITY_THRESHOLD:
        print(f"\n✅ PASS: Text embeddings are identical! (similarity: {cosine_sim:.8f})")
        return True
    else:
        print(f"\n❌ FAIL: Text embeddings differ (similarity: {cosine_sim:.8f})")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test CLIP embedding parity between local GPU and Modal.com")
    parser.add_argument("--image", type=str, help="Path to test image (default: test_tattoo.jpg)")
    parser.add_argument("--text", type=str, help="Test text query (e.g., 'fine line floral tattoo')")
    args = parser.parse_args()

    # Configuration check
    print("Configuration:")
    print(f"  Local GPU:  {LOCAL_CLIP_URL}")
    print(f"  Modal.com:  {MODAL_FUNCTION_URL or 'NOT CONFIGURED'}")

    if not MODAL_FUNCTION_URL:
        print("\n❌ Error: MODAL_FUNCTION_URL not configured")
        print("   Set it in .env.local or as environment variable")
        sys.exit(1)

    results = []

    # Test image embedding
    if not args.text:
        image_path = args.image or "test_tattoo.jpg"

        # Try to find a test image
        if not Path(image_path).exists():
            # Try finding any jpg/png in current directory
            image_files = list(Path(".").glob("*.jpg")) + list(Path(".").glob("*.png"))
            if image_files:
                image_path = str(image_files[0])
                print(f"\n📸 Using test image: {image_path}")
            else:
                print(f"\n❌ Error: No test image found")
                print(f"   Please provide a test image:")
                print(f"   python {sys.argv[0]} --image path/to/image.jpg")
                sys.exit(1)

        image_base64 = load_test_image(image_path)
        results.append(("Image", test_image_embedding_parity(image_base64)))

    # Test text embedding
    if args.text or not args.image:
        test_text = args.text or "fine line floral tattoo"
        results.append(("Text", test_text_embedding_parity(test_text)))

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    all_passed = all(result for _, result in results)

    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")

    if all_passed:
        print("\n🎉 All tests passed! Local GPU and Modal produce identical embeddings.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Check configuration and model weights.")
        sys.exit(1)

if __name__ == "__main__":
    main()
