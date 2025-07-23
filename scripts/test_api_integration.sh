#!/usr/bin/env bash

# 🧪 API Integration Testing Script
# Tests real Qloo and OpenAI API integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Cleanup function
cleanup() {
    print_status "🧹 Cleaning up processes..."
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "nodemon" 2>/dev/null || true
    pkill -f "react-scripts" 2>/dev/null || true
    sleep 2
}

# Trap to ensure cleanup on script exit
trap cleanup EXIT

echo "=========================================="
echo "  🚀 API Integration Testing"
echo "=========================================="

# 1. Check environment variables
print_status "🧪 1. Checking environment variables"

if [ -f ".env" ]; then
    source .env
    print_success "Loaded .env file"
else
    print_warning "No .env file found, using .env.example"
    if [ -f ".env.example" ]; then
        source .env.example
    fi
fi

# Check API keys
if [ -z "$QLOO_API_KEY" ]; then
    print_error "QLOO_API_KEY not set"
    exit 1
else
    print_success "QLOO_API_KEY is configured"
fi

if [ -z "$OPENAI_API_KEY" ]; then
    print_warning "OPENAI_API_KEY not set - AI enhancement will be disabled"
else
    print_success "OPENAI_API_KEY is configured"
fi

# 2. Start services
print_status "🔧 2. Starting backend and frontend services"

# Start backend
cd backend || exit 1
print_status "Installing backend dependencies..."
npm ci > /dev/null 2>&1

print_status "Starting backend server..."
npm run dev > ../backend_api_test.log 2>&1 &
BACKEND_PID=$!
cd ..

# Start frontend
cd frontend || exit 1
print_status "Installing frontend dependencies..."
npm ci > /dev/null 2>&1

print_status "Starting frontend server..."
BROWSER=none npm start > ../frontend_api_test.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for services to start
print_status "Waiting for services to start..."
sleep 8

# 3. Test backend health
print_status "🌐 3. Testing backend health"

if curl -s http://localhost:3001/health > /dev/null; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
    exit 1
fi

# 4. Test API status endpoint
print_status "🔍 4. Checking API integration status"

API_STATUS=$(curl -s http://localhost:3001/api-status)
echo "$API_STATUS" | jq . 2>/dev/null || echo "$API_STATUS"

# Check if Qloo API is accessible
QLOO_STATUS=$(echo "$API_STATUS" | jq -r '.apis.qloo.status' 2>/dev/null || echo "unknown")
if [ "$QLOO_STATUS" = "healthy" ]; then
    print_success "Qloo API is accessible"
elif [ "$QLOO_STATUS" = "mock" ]; then
    print_warning "Using mock data (no API key or API unavailable)"
else
    print_warning "Qloo API status: $QLOO_STATUS"
fi

# Check OpenAI status
OPENAI_STATUS=$(echo "$API_STATUS" | jq -r '.apis.openai.status' 2>/dev/null || echo "unknown")
if [ "$OPENAI_STATUS" = "configured" ]; then
    print_success "OpenAI API is configured"
else
    print_warning "OpenAI API not configured - using fallback"
fi

# 5. Test recommendations with real API
print_status "🧩 5. Testing recommendation endpoint with real APIs"

RECOMMENDATION_REQUEST='{
    "interests": ["adventure", "culture", "dining"],
    "location": "Mediterranean",
    "budget": "moderate"
}'

print_status "Sending recommendation request..."
RESPONSE=$(curl -s -X POST http://localhost:3001/recommend \
    -H 'Content-Type: application/json' \
    -d "$RECOMMENDATION_REQUEST")

echo "Response received:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

# Validate response structure
if echo "$RESPONSE" | grep -q '"success":true'; then
    print_success "Recommendation request successful"
    
    # Check if we got real API data or mock data
    SOURCE=$(echo "$RESPONSE" | jq -r '.recommendations.metadata.source' 2>/dev/null || echo "unknown")
    if [ "$SOURCE" = "qloo" ]; then
        print_success "✨ Using real Qloo API data!"
    elif [ "$SOURCE" = "mock" ]; then
        print_warning "Using mock data (API fallback)"
    else
        print_warning "Unknown data source: $SOURCE"
    fi
    
    # Check AI enhancement
    ENHANCED=$(echo "$RESPONSE" | jq -r '.recommendations.enhanced' 2>/dev/null || echo "false")
    if [ "$ENHANCED" = "true" ]; then
        print_success "✨ AI enhancement active (OpenAI working)!"
    else
        print_warning "AI enhancement not active"
    fi
    
    # Count recommendations
    REC_COUNT=$(echo "$RESPONSE" | jq '.recommendations.recommendations | length' 2>/dev/null || echo "0")
    print_success "Received $REC_COUNT recommendations"
    
else
    print_error "Recommendation request failed"
    echo "$RESPONSE"
    exit 1
fi

# 6. Test frontend integration
print_status "🌐 6. Testing frontend integration"

if curl -s http://localhost:3000 > /dev/null; then
    print_success "Frontend is accessible at http://localhost:3000"
else
    print_error "Frontend is not accessible"
    exit 1
fi

# 7. Test different interest combinations
print_status "🎯 7. Testing various interest combinations"

TEST_CASES=(
    '{"interests":["music","food"],"location":"Caribbean","budget":"luxury"}'
    '{"interests":["adventure","nature"],"location":"Alaska","budget":"budget"}'
    '{"interests":["culture","history"],"location":"Northern Europe","budget":"moderate"}'
)

for i in "${!TEST_CASES[@]}"; do
    print_status "Test case $((i+1)): ${TEST_CASES[$i]}"
    
    TEST_RESPONSE=$(curl -s -X POST http://localhost:3001/recommend \
        -H 'Content-Type: application/json' \
        -d "${TEST_CASES[$i]}")
    
    if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
        TEST_COUNT=$(echo "$TEST_RESPONSE" | jq '.recommendations.recommendations | length' 2>/dev/null || echo "0")
        print_success "✓ Test case $((i+1)): $TEST_COUNT recommendations"
    else
        print_error "✗ Test case $((i+1)) failed"
    fi
done

# 8. Performance test
print_status "⚡ 8. Performance testing"

START_TIME=$(date +%s%N)
for i in {1..5}; do
    curl -s -X POST http://localhost:3001/recommend \
        -H 'Content-Type: application/json' \
        -d "$RECOMMENDATION_REQUEST" > /dev/null
done
END_TIME=$(date +%s%N)

DURATION=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds
AVG_TIME=$(( DURATION / 5 ))

print_success "Average response time: ${AVG_TIME}ms (5 requests)"

# 9. Check logs
print_status "📄 9. Checking application logs"

if [ -f "backend/logs/combined.log" ]; then
    LOG_ENTRIES=$(grep -c "Recommendation request received" backend/logs/combined.log 2>/dev/null || echo "0")
    print_success "Found $LOG_ENTRIES recommendation requests in logs"
    
    if grep -q "Qloo API request successful" backend/logs/combined.log 2>/dev/null; then
        print_success "✨ Real Qloo API calls detected in logs!"
    fi
    
    if grep -q "OpenAI enhancement completed" backend/logs/combined.log 2>/dev/null; then
        print_success "✨ OpenAI enhancements detected in logs!"
    fi
else
    print_warning "No application logs found"
fi

# 10. Final summary
echo ""
echo "=========================================="
echo "  📊 Integration Test Summary"
echo "=========================================="

print_success "✅ All integration tests completed!"

echo ""
echo "🔗 Service URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   API Status: http://localhost:3001/api-status"

echo ""
echo "📁 Log Files:"
echo "   Backend: backend_api_test.log"
echo "   Frontend: frontend_api_test.log"
echo "   Application: backend/logs/combined.log"

echo ""
echo "🎯 Next Steps:"
if [ "$SOURCE" = "qloo" ] && [ "$ENHANCED" = "true" ]; then
    print_success "🚀 Full API integration is working! Ready for production."
elif [ "$SOURCE" = "qloo" ]; then
    print_warning "⚡ Qloo API working, but OpenAI enhancement needs setup."
elif [ "$ENHANCED" = "true" ]; then
    print_warning "⚡ OpenAI working, but Qloo API needs configuration."
else
    print_warning "🔧 Both APIs need configuration for full functionality."
fi

echo ""
print_warning "Press ENTER to stop services, or Ctrl+C to keep them running for manual testing..."
read -r

cleanup
print_success "🎉 Integration testing completed!"