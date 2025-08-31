#!/bin/bash

# Mechanic's Best Friend Auto-Start Script
# This script automatically sets up and starts the application

echo "🔧 Mechanic's Best Friend - Auto-Setup Starting..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js from https://nodejs.org/"
    echo "   After installing Node.js, run this script again."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️ Creating environment configuration..."
    cat > .env << EOF
# Auto-generated environment file for Mechanic's Best Friend
GITHUB_OWNER=BrianLovegrove
GITHUB_REPO=Mechanics-Best-Friend
GITHUB_BRANCH=main
GITHUB_TOKEN=development_mode_no_token_required
SESSION_SECRET=mechanics_best_friend_$(date +%s)
PORT=3000
EOF
    echo "✅ Environment file created"
else
    echo "✅ Environment file already exists"
fi

# Check if users.json exists
if [ ! -f "users.json" ]; then
    echo "❌ users.json file not found. Creating default users..."
    cat > users.json << 'EOF'
[
  {
    "username": "ADMIN",
    "password": "$2b$10$v3W6DvuunOzkYBDzAHxqeeZm25nxJ2ATjjqg/2p/b1EOhb2zSRqCi",
    "role": "admin"
  },
  {
    "username": "MECH", 
    "password": "$2b$10$DHyq.gQgfAnHuzY5jpNSqeyPVhYq0sjU5jJwbKoZcYiVicl/si6Cm",
    "role": "mech"
  }
]
EOF
    echo "✅ Default users created (ADMIN/1234, MECH/1234)"
fi

echo ""
echo "🚀 Starting Mechanic's Best Friend..."
echo "   Server will be available at: http://localhost:3000"
echo "   Login credentials:"
echo "   - ADMIN: 1234 (full access + file upload)"
echo "   - MECH:  1234 (read-only access)"
echo ""
echo "   Press Ctrl+C to stop the server"
echo ""

# Start the server
npm start