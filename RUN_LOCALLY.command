#!/bin/bash
# TPT Infrastructure Engineer - One Click Local Run for Mac / Linux
# NO DOCKER REQUIRED - Runs natively on any MacOS 12+ or Ubuntu 20.04+ desktop
# Double click this file to start the application automatically

clear
echo "==================================================="
echo "TPT Infrastructure Engineer"
echo "Starting local instance..."
echo "==================================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "Installing Python..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # MacOS
        brew install python@3.12
    else
        # Linux
        sudo apt update && sudo apt install -y python3 python3-pip python3-venv
    fi
fi

# Create virtual environment if not exists
if [ ! -d ".venv" ]; then
    echo "Creating environment..."
    python3 -m venv .venv
fi

# Activate environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r backend/requirements.txt > /dev/null

# Install Node.js if needed
if ! command -v node &> /dev/null
then
    echo "Installing Node.js..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node
    else
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt install -y nodejs
    fi
fi

# Build frontend
echo "Building frontend..."
cd frontend
npm install --silent
npm run build
cd ..

# Start application
echo ""
echo "==================================================="
echo "Application is starting!"
echo "Open your browser at:  http://localhost:8000"
echo "==================================================="
echo ""
echo "Press CTRL+C to stop the server"
echo ""

uvicorn backend.main:app --host 127.0.0.1 --port 8000