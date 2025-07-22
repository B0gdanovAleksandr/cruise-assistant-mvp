#!/bin/bash

# Cruise Assistant MVP - Local Testing Script
# This script automates the testing of the MVP functionality

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=3001
FRONTEND_PORT=3000
BACKEND_DIR="backend"
FRONTEND_DIR="frontend"
LOG_FILE="backend/logs/combined.log"
ERROR_LOG="backend/logs/error.log"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to cleanup processes
cleanup() {
    print_status "Cleaning up processes..."
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "react-scripts start" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    sleep 2
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within $((max_attempts * 2)) seconds"
    return 1
}

# Function to test API endpoint
test_api_endpoint() {
    local endpoint=$1
    local method=$2
    local data=$3
    local expected_status=$4
    local test_name=$5

    print_status "Testing: $test_name"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" "$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        print_success "$test_name - HTTP $http_code"
        echo "$body" | jq . 2>/dev/null || echo "$body"
        return 0
    else
        print_error "$test_name - Expected $expected_status, got $http_code"
        echo "$body"
        return 1
    fi
}

# Function to check logs
check_logs() {
    local log_file=$1
    local pattern=$2
    local test_name=$3

    print_status "Checking logs: $test_name"
    
    if [ -f "$log_file" ]; then
        if grep -q "$pattern" "$log_file"; then
            print_success "$test_name - Pattern found in logs"
            grep "$pattern" "$log_file" | tail -2
            return 0
        else
            print_warning "$test_name - Pattern not found in logs"
            return 1
        fi
    else
        print_warning "$test_name - Log file not found: $log_file"
        return 1
    fi
}

# Main testing function
main() {
    echo "=========================================="
    echo "  Cruise Assistant MVP - Local Testing"
    echo "=========================================="
    
    # Cleanup any existing processes
    cleanup
    
    # Check if dependencies are installed
    print_status "Checking dependencies..."
    
    if [ ! -d "$BACKEND_DIR/node_modules" ]; then
        print_error "Backend dependencies not installed. Run: cd $BACKEND_DIR && npm install"
        exit 1
    fi
    
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        print_error "Frontend dependencies not installed. Run: cd $FRONTEND_DIR && npm install"
        exit 1
    fi
    
    # Create logs directory
    mkdir -p backend/logs
    
    # Start backend
    print_status "Starting backend server..."
    cd $BACKEND_DIR
    npm run dev > ../backend_output.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    print_status "Starting frontend server..."
    cd $FRONTEND_DIR
    BROWSER=none npm start > ../frontend_output.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for services to be ready
    wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend"
    wait_for_service "http://localhost:$FRONTEND_PORT" "Frontend"
    
    echo ""
    echo "=========================================="
    echo "  Running API Tests"
    echo "=========================================="
    
    # Test 1: Health check
    test_api_endpoint "http://localhost:$BACKEND_PORT/health" "GET" "" "200" "Health Check"
    
    # Test 2: Recommendations with mock data
    test_data='{
        "interests": ["Adventure", "Culture", "Dining"],
        "location": "Mediterranean",
        "budget": "moderate"
    }'
    
    test_api_endpoint "http://localhost:$BACKEND_PORT/recommend" "POST" "$test_data" "200" "Get Recommendations (Mock Data)"
    
    # Test 3: Check Winston logging
    sleep 2
    check_logs "$LOG_FILE" "Recommendation request received" "Winston Request Logging"
    check_logs "$LOG_FILE" "Using mock Qloo data" "Mock Data Fallback Logging"
    
    # Test 4: Test with empty QLOO_API_KEY (fallback scenario)
    print_status "Testing fallback scenario (no API key)..."
    
    # Kill backend and restart without API key
    kill $BACKEND_PID 2>/dev/null || true
    sleep 2
    
    cd $BACKEND_DIR
    QLOO_API_KEY="" npm run dev > ../backend_fallback.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    wait_for_service "http://localhost:$BACKEND_PORT/health" "Backend (Fallback Mode)"
    
    test_api_endpoint "http://localhost:$BACKEND_PORT/recommend" "POST" "$test_data" "200" "Get Recommendations (Fallback Mode)"
    
    # Test 5: Check fallback logging
    sleep 2
    check_logs "$LOG_FILE" "Using mock Qloo data" "Fallback Mode Logging"
    
    echo ""
    echo "=========================================="
    echo "  Manual Testing Instructions"
    echo "=========================================="
    
    print_status "Frontend is running at: http://localhost:$FRONTEND_PORT"
    print_status "Backend is running at: http://localhost:$BACKEND_PORT"
    
    echo ""
    echo "Manual tests to perform:"
    echo "1. Open http://localhost:$FRONTEND_PORT in your browser"
    echo "2. Select interests: Adventure, Culture, Dining"
    echo "3. Choose location: Mediterranean"
    echo "4. Select budget: Moderate ($$)"
    echo "5. Click 'Get My Recommendations'"
    echo "6. Verify mock recommendations are displayed"
    echo "7. Check browser network tab for API calls"
    
    echo ""
    print_warning "Press ENTER to continue with cleanup, or Ctrl+C to keep services running for manual testing..."
    read -r
    
    # Cleanup
    cleanup
    
    echo ""
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    
    print_success "All automated tests completed!"
    print_status "Check the following log files for details:"
    echo "  - backend_output.log (Backend startup logs)"
    echo "  - frontend_output.log (Frontend startup logs)"
    echo "  - backend/logs/combined.log (Winston application logs)"
    echo "  - backend/logs/error.log (Winston error logs)"
    
    echo ""
    print_status "To run manual tests, execute: bash scripts/check_local.sh"
    print_status "Then navigate to http://localhost:3000 for UI testing"
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@"