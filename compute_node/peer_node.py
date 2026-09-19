import os
import io
import time
import base64
import json
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

# PyTorch + Vision imports
try:
    import torch
    import torchvision.transforms as transforms
    from torchvision import models
    from PIL import Image
    HAS_TORCH = True
except ImportError as e:
    print(f"[!] Missing dependency: {e}")
    print("[!] Run: pip install torch torchvision pillow flask-cors")
    HAS_TORCH = False

app = Flask(__name__)
CORS(app)

PORT = 5005
IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs"

# ─── Load Pre-trained Model ────────────────────────────────────
model = None
imagenet_labels = None

def load_model():
    """Load a pre-trained ResNet50 model for image classification."""
    global model, imagenet_labels
    if not HAS_TORCH:
        return

    print("[*] Loading pre-trained ResNet50 model...")
    model = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V2)
    model.eval()

    # Load ImageNet class labels (includes 120+ dog breeds)
    labels_url = "https://raw.githubusercontent.com/anishathalye/imagenet-simple-labels/master/imagenet-simple-labels.json"
    try:
        resp = requests.get(labels_url, timeout=10)
        imagenet_labels = resp.json()
        print(f"[*] Loaded {len(imagenet_labels)} ImageNet labels.")
    except Exception:
        # Fallback: use index numbers if labels can't be fetched
        imagenet_labels = [f"class_{i}" for i in range(1000)]
        print("[!] Could not fetch labels, using indices.")

    print("[✓] ResNet50 ready for inference!")

# Image preprocessing pipeline (must match ImageNet training)
preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

def classify_image(image_base64):
    """Run actual PyTorch inference on a base64-encoded image."""
    # Decode base64 to PIL Image
    # Strip data URL prefix if present (e.g., "data:image/png;base64,...")
    if ',' in image_base64:
        image_base64 = image_base64.split(',', 1)[1]

    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

    # Preprocess
    input_tensor = preprocess(image).unsqueeze(0)  # Add batch dimension

    # Inference
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)

    # Get top 5 predictions
    top5_prob, top5_idx = torch.topk(probabilities, 5)
    results = []
    for i in range(5):
        label = imagenet_labels[top5_idx[i].item()] if imagenet_labels else f"class_{top5_idx[i].item()}"
        confidence = top5_prob[i].item() * 100
        results.append({"label": label, "confidence": f"{confidence:.1f}%"})

    return results

def generate_response(prompt, image_base64, modality):
    """Generate a meaningful response based on prompt and/or image."""
    response_parts = []

    # Image classification
    if image_base64 and model is not None:
        try:
            predictions = classify_image(image_base64)
            top_pred = predictions[0]
            response_parts.append(f"Based on my analysis, this appears to be a **{top_pred['label']}** (confidence: {top_pred['confidence']}).")
            response_parts.append("\nTop 5 predictions:")
            for i, pred in enumerate(predictions, 1):
                response_parts.append(f"  {i}. {pred['label']} — {pred['confidence']}")
        except Exception as e:
            response_parts.append(f"[Vision Error] Could not process image: {str(e)}")

    # Text analysis
    if prompt:
        # Extract the actual user question from the formatted prompt
        user_question = prompt
        if "User Question:" in prompt:
            user_question = prompt.split("User Question:")[-1].strip()

        if not image_base64:
            response_parts.append(f"Received your query: \"{user_question}\". Note: This node specializes in image classification. For best results, attach an image.")

    if not response_parts:
        response_parts.append("No input received. Please provide an image or text prompt.")

    return "\n".join(response_parts)


# ─── API Routes ─────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "torch_available": HAS_TORCH,
        "model_loaded": model is not None,
        "model_type": "ResNet50 (ImageNet)"
    })

@app.route('/process', methods=['POST'])
def process_payload():
    """
    Receives inference jobs from the SYN3RGY network.
    Payload: { prompt, image_base64, weights_cid, config_cid, input_modality }
    """
    data = request.json

    prompt = data.get('prompt', '')
    image_base64 = data.get('image_base64', None)
    weights_cid = data.get('weights_cid', None)
    config_cid = data.get('config_cid', None)
    modality = data.get('input_modality', 'text')

    print(f"\n[SYN3RGY-NODE] Incoming request. Modality: {modality}")
    print(f"[SYN3RGY-NODE] Image attached: {bool(image_base64)}")

    start_time = time.time()

    if not HAS_TORCH or model is None:
        # Fallback if torch/model not loaded
        response = f"[Peer Node Error] PyTorch model not loaded. Please ensure torch and torchvision are installed.\nPrompt received: {prompt}"
    else:
        response = generate_response(prompt, image_base64, modality)

    duration = time.time() - start_time
    print(f"[*] Inference complete. Duration: {duration:.2f}s")

    return jsonify({
        "success": True,
        "response": response,
        "metrics": {
            "duration": duration,
            "torch_utilized": HAS_TORCH,
            "model": "ResNet50-ImageNet"
        }
    })


# ─── Entry Point ────────────────────────────────────────────────

if __name__ == '__main__':
    print(r"""
      _____ __  __ _   _ ____  ____   ______   __
     / ____|  \/  | \ | |___ \|  _ \ / ___\ \ / /
    | (___ | \  / |  \| | __) | |_) | |  __\ V / 
     \___ \| |\/| | . ` ||__ <|  _ <| | |_ |> <  
     ____) | |  | | |\  |___) | |_) | |__| / . \ 
    |_____/|_|  |_|_| \_|____/|____/ \____/_/ \_\
    """)
    print("─── SYN3RGY DECENTRALIZED PEER NODE ───")
    print(f"Starting compute worker on port {PORT}...")

    os.makedirs("models", exist_ok=True)

    # Load the AI model at startup
    load_model()

    print(f"\n🟢 Peer Node live at http://0.0.0.0:{PORT}")
    print("Expose this port using: `ngrok http 5005`\n")
    app.run(host='0.0.0.0', port=PORT)
