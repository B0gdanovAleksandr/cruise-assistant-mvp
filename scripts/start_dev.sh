#!/bin/bash

# Quick development startup script
# Starts both backend and frontend in development mode

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to cleanup processes on exit
cleanup() {
    print_status "Shutting down services..."
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    exit 0
}

# Trap to ensure cleanup on script exit
trap cleanup SIGINT SIGTERM

echo "=========================================="
echo "  Cruise Assistant MVP - Development"
echo "=========================================="

# Check if dependencies are installed
print_status "Checking dependencies..."

if [ ! -d "backend/node_modules" ]; then
    print_warning "Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    print_warning "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Create logs directory
mkdir -p backend/logs

print_success "Starting development servers..."

# Start backend in background
print_status "Starting backend server on port 3001..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
print_status "Starting frontend server on port 3000..."
cd frontend
BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

print_success "Development servers started!"
echo ""
echo "🚀 Frontend: http://localhost:3000"
echo "🔧 Backend:  http://localhost:3001"
echo "📊 Health:   http://localhost:3001/health"
echo ""
print_warning "Press Ctrl+C to stop all services"

# Wait for user to stop
wait