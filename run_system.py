import subprocess
import os
import time
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    api_script = os.path.join(root_dir, "api", "app.py")
    
    print("======================================================")
    print("Starting Hyperlocal Rainfall Prediction System...")
    print("======================================================")

    # 1. Start Flask API server
    print("\n[1/2] Starting Flask Backend API on http://127.0.0.1:5000 ...")
    api_process = subprocess.Popen([sys.executable, api_script], cwd=root_dir)
    
    time.sleep(2) # Give Flask a moment to boot

    # 2. Start Vite React app
    print("\n[2/2] Starting React Frontend on http://localhost:5173 ...")
    
    # Use shell=True for npm on Windows
    use_shell = sys.platform.startswith('win')
    
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"], 
        cwd=frontend_dir, 
        shell=use_shell
    )

    try:
        # Keep the script running so we can kill both cleanly with CTRL+C
        api_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n\nStopping system...")
        api_process.terminate()
        frontend_process.terminate()
        print("System stopped successfully.")

if __name__ == "__main__":
    main()
