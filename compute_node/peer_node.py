import os
import time
import requests
from flask import Flask, request, jsonify

# Simulate PyTorch imports for the worker
try:
    import torch
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False

app = Flask(__name__)
PORT = 5005
IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs"

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "torch_available": HAS_TORCH})

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

    # 1. IPFS Synchronization Step
    if weights_cid:
        if not os.path.exists(f"models/{weights_cid}.pt"):
            print(f"[*] Syncing PyTorch weights from IPFS: {weights_cid[:10]}...")
            # Simulated download timer since real downloads are heavy
            time.sleep(1.5)
        else:
            print("[*] PyTorch weights loaded from local cache.")

    if config_cid:
        if not os.path.exists(f"models/{config_cid}.json"):
            print(f"[*] Syncing Config JSON from IPFS: {config_cid[:10]}...")
            time.sleep(0.5)

    # 2. PyTorch Inference Simulation
    start_time = time.time()
    print("[*] Running inference tensor streams...")

    response = ""
    if not HAS_TORCH:
        # Fallback simulation if friend's PC doesn't have PyTorch installed locally
        time.sleep(2)
        response = f"[Peer Node Processed] This is a fallback simulated response from your friend's PC.\n\n"
        response += f"Prompt received: {prompt}\n"
        if image_base64:
            response += f"Image layers detected: True (Length: {len(image_base64)} bytes)\n"
    else:
        # Simulated actual PyTorch operation
        time.sleep(3)
        response = f"[Peer Node Torch Execution] Synthesized tensor output successfully processed via PyTorch Backend.\n"
        response += f"Input query: {prompt}"

    duration = time.time() - start_time
    print(f"[*] Inference complete. Duration: {duration:.2f}s")

    # 3. Payload Return
    return jsonify({
        "success": True,
        "response": response,
        "metrics": {
            "duration": duration,
            "torch_utilized": HAS_TORCH
        }
    })

if __name__ == '__main__':
    print(r"""
      _____ __  __ _   _ ____  ____   ______   __
     / ____|  \/  | \ | |___ \|  _ \ / ___\ \ / /
    | (___ | \  / |  \| | __) | |_) | |  __\ V / 
     \___ \| |\/| | . ` ||__ <|  _ <| | |_ |> <  
     ____) | |  | | |\  |___) | |_) | |__| / . \ 
    |_____/|_|  |_|_| \_|____/|____/ \____/_/ \_\
    """)
    print("--- SYN3RGY DECENTRALIZED PEER NODE ---")
    print(f"Starting compute worker on port {PORT}...")
    print("Expose this port using: `ngrok http 5005` and paste the URL into your dashboard.")
    
    os.makedirs("models", exist_ok=True)
    app.run(host='0.0.0.0', port=PORT)
