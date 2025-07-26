#!/bin/bash

# Multi-user testing script for Flux
# This script starts multiple frontend instances on different ports

echo "🚀 Starting Flux Multi-User Testing Setup"
echo "=========================================="

# Check if dfx is running
if ! pgrep -f "dfx start" > /dev/null; then
    echo "⚠️  dfx is not running. Starting dfx..."
    cd /home/folugboji/Desktop/Projects/flux/flux
    dfx start --background --clean
    sleep 5
else
    echo "✅ dfx is already running"
fi

# Navigate to project directory
cd /home/folugboji/Desktop/Projects/flux/flux

# Deploy canisters if needed
echo "📦 Deploying canisters..."
dfx deploy

# Get canister URLs
BACKEND_URL=$(dfx canister id flux_backend)
echo "🔗 Backend Canister ID: $BACKEND_URL"

echo ""
echo "🌐 Starting Frontend Instances:"
echo "================================"

# Start first instance (User 1)
echo "🧑‍💻 User 1: http://localhost:3000"
cd src/flux_frontend
gnome-terminal --title="Flux User 1 (Port 3000)" -- bash -c "npm run start; exec bash" &

# Wait a moment
sleep 2

# Start second instance (User 2)
echo "🧑‍💻 User 2: http://localhost:3001"
gnome-terminal --title="Flux User 2 (Port 3001)" -- bash -c "npm run start -- --port 3001; exec bash" &

# Wait a moment
sleep 2

# Start third instance (User 3) - optional
echo "🧑‍💻 User 3: http://localhost:3002"
gnome-terminal --title="Flux User 3 (Port 3002)" -- bash -c "npm run start -- --port 3002; exec bash" &

echo ""
echo "✨ Multi-User Setup Complete!"
echo "============================="
echo ""
echo "📱 Open these URLs in different browsers or incognito windows:"
echo "   • User 1: http://localhost:3000"
echo "   • User 2: http://localhost:3001" 
echo "   • User 3: http://localhost:3002"
echo ""
echo "🔐 Each instance will have independent authentication"
echo "📹 Test video uploads and interactions between users"
echo ""
echo "🛑 To stop all instances:"
echo "   pkill -f 'vite.*--port'"
echo "   dfx stop"

# Keep script running to show status
echo ""
echo "Press Ctrl+C to stop this status monitor..."
while true; do
    sleep 30
    echo "⏰ $(date): Multi-user setup is running..."
done
