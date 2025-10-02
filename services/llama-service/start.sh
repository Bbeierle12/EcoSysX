#!/bin/bash

# Llama Service Startup Script

echo "🚀 Starting Llama 3.2-1B-Instruct Service for EcoSysX"
echo "=================================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Check if requirements are installed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
fi

echo ""
echo "📋 Service Configuration:"
echo "  - Model: meta-llama/Llama-3.2-1B-Instruct"
echo "  - Port: 8000"
echo "  - Endpoint: http://localhost:8000"
echo ""
echo "⏳ Loading model (this may take a few minutes on first run)..."
echo ""

# Start the service
python3 llama_server.py
