from flask import Flask, jsonify
from flask_cors import CORS
import sys
import os
import time

# Allow imports from project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from predict import predict_all

app = Flask(__name__)
# Enable CORS for all domains so React can connect
CORS(app)

# Cache variables
CACHE_TIMEOUT = 1800  # 30 minutes in seconds
cached_predictions = None
last_fetch_time = 0

@app.route("/api/status", methods=["GET"])
def get_status():
    return jsonify({"status": "running"})

@app.route("/api/predictions", methods=["GET"])
def get_predictions():
    global cached_predictions, last_fetch_time
    
    current_time = time.time()
    
    # If cache is valid, return cached predictions
    if cached_predictions and (current_time - last_fetch_time < CACHE_TIMEOUT):
        return jsonify({
            "cached": True,
            "last_updated": int(last_fetch_time),
            "data": cached_predictions
        })
    
    # Fetch fresh predictions
    try:
        results = predict_all()
        # Update cache
        cached_predictions = results
        last_fetch_time = time.time()
        
        return jsonify({
            "cached": False,
            "last_updated": int(last_fetch_time),
            "data": cached_predictions
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, port=5000)
