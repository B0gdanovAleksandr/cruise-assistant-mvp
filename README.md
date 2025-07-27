# 🚢 Cruise Personal Assistant MVP

A personalized cruise travel assistant that provides tailored recommendations based on user interests, location preferences, and budget, enhanced with AI insights from ChatGPT.

## 🎯 Project Status: Advanced Entity Resolution & Insights System ✅

**Current Version:** 3.2.0 - Advanced Entity Resolution  
**Status:** Production Ready with Entity Resolution & AI Enhancement  
**Last Updated:** January 27, 2025

### ✅ Completed Features
- [x] Interactive interest selection UI
- [x] Location and budget preference selection
- [x] Qloo API integration for real recommendations
- [x] **ChatGPT API integration for AI-enhanced insights**
- [x] **Full Docker containerization with nginx proxy**
- [x] **Multi-stage Docker builds for optimization**
- [x] **Health checks and monitoring**
- [x] **Advanced Entity Resolution System**
- [x] **Insights Aggregator with Cross-type Analysis**
- [x] **URN Registry Management**
- [x] **Enhanced API Testing & Validation**
- [x] Real-time recommendation filtering
- [x] Responsive design with modern UI
- [x] Comprehensive logging with Winston
- [x] Error handling and graceful fallbacks
- [x] Full test coverage (unit + integration)
- [x] CI/CD pipeline with GitHub Actions
- [x] Automated QA testing scripts

### 🐳 Docker Features (New in v3.1!)
- [x] **Multi-stage Docker builds** for optimized production images
- [x] **Nginx reverse proxy** with API routing
- [x] **Health checks** for both frontend and backend
- [x] **Docker Compose** for easy orchestration
- [x] **Production-ready configuration** with security headers
- [x] **Static file caching** and gzip compression
- [x] **SPA routing support** for React application
- [x] **Environment variable management** for Docker

### 🤖 AI Features
- [x] **AI-Enhanced Recommendations** - ChatGPT provides personalized insights
- [x] **Smart Summaries** - AI-generated activity summaries
- [x] **Personalized Advice** - Context-aware recommendations
- [x] **Budget Tips** - AI-powered cost-saving suggestions
- [x] **Best Times** - Intelligent timing recommendations
- [x] **Fallback System** - Graceful degradation when AI is unavailable

### 🔍 Entity Resolution Features (New in v3.2!)
- [x] **Intelligent Entity Resolution** - Convert user input to Qloo entities
- [x] **Confidence-based Filtering** - Configurable confidence thresholds
- [x] **Cross-type Insights Analysis** - Brand, place, tag, audience relationships
- [x] **Taste Profile Generation** - Comprehensive user preference mapping
- [x] **URN Registry Management** - Entity validation and caching
- [x] **Enhanced API Testing** - Comprehensive API key validation

## 🚀 Quick Start

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

#### Quick Docker Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd cruise-assistant-mvp
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys:
# QLOO_API_KEY=REPLACE_WITH_YOUR_QLOO_API_KEY
# OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY
```

3. **Build and start with Docker**
```bash
docker-compose up -d
```

The application will be available at:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`

#### Docker Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose build --no-cache

# Check service status
docker-compose ps
```

### Option 2: Local Development

#### Prerequisites
- Node.js 18+
- npm 8+
- Git

#### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd cruise-assistant-mvp
```

2. **Install dependencies**
```bash
npm run install:all
```

3. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your API keys:
# QLOO_API_KEY=REPLACE_WITH_YOUR_QLOO_API_KEY
# OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY
```

4. **Start development servers**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
cruise-assistant-mvp/
├── backend/                    # Node.js + Express API
│   ├── src/
│   │   ├── index.js           # Main server file
│   │   ├── services/
│   │   │   ├── qlooClient.js  # Qloo API integration
│   │   │   ├── llmClient.js   # OpenAI ChatGPT integration
│   │   │   ├── recommendationGenerator.js # Recommendation logic
│   │   │   ├── entityResolver.js # Entity resolution service
│   │   │   ├── insightsAggregator.js # Insights aggregation
│   │   │   └── urnRegistry.js # URN registry management
│   │   ├── mock/
│   │   │   └── qlooMock.json  # Mock recommendation data
│   │   ├── utils/
│   │   │   └── logger.js      # Winston logging setup
│   │   └── __tests__/         # Backend tests
│   ├── logs/                  # Application logs
│   ├── test-api-key.js        # API key validation script
│   ├── Dockerfile             # Multi-stage Docker build
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── components/
│   │   │   ├── InterestSelector.jsx
│   │   │   ├── RecommendationsList.jsx
│   │   │   └── GeneratedActivitiesList.jsx
│   │   ├── views/
│   │   │   └── RecommendationsView.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── api.ts
│   │   ├── App.css            # Styling
│   │   └── index.js           # React entry point
│   ├── Dockerfile             # Multi-stage Docker build
│   ├── nginx.conf             # Nginx configuration
│   └── package.json
├── docker-compose.yml         # Docker orchestration
├── scripts/
│   ├── check_local.sh         # QA automation script
│   └── start_dev.sh           # Development startup script
├── .github/workflows/
│   └── ci-cd.yml              # GitHub Actions pipeline
├── .env.example               # Environment variables template
└── README.md
```

## 🐳 Docker Architecture

### Container Structure
- **Frontend Container**: React app served by Nginx
- **Backend Container**: Node.js Express API
- **Network**: Internal Docker network for service communication

### Key Features
- **Multi-stage builds** for optimized production images
- **Nginx reverse proxy** with API routing and caching
- **Health checks** for both services
- **Volume mounting** for logs and configuration
- **Environment variable** management
- **Security headers** and CORS configuration

## 🔧 API Endpoints

### Backend Server (Port 3001)

#### `GET /`
Returns API information and available endpoints.

#### `GET /health`
Health check endpoint for monitoring.

#### `GET /api-status`
Returns status of all integrated APIs (Qloo, OpenAI).

#### `POST /recommend`
Get personalized cruise recommendations with AI enhancement.

**Request Body:**
```json
{
  "interests": ["Adventure", "Culture", "Dining"],
  "location": "Mediterranean",
  "budget": "moderate"
}
```

**Response:**
```json
{
  "success": true,
  "recommendations": {
    "recommendations": [
      {
        "id": "rec_001",
        "name": "Sunset Dinner Cruise",
        "description": "Romantic dinner cruise with panoramic ocean views",
        "categories": ["dining", "romance", "scenic"],
        "rating": 4.8,
        "price_range": "$$",
        "location": "Mediterranean",
        "duration": "3 hours",
        "highlights": ["Gourmet cuisine", "Live music", "Sunset views"]
      }
    ],
    "enhanced": true,
    "aiInsights": {
      "summary": "Perfect blend of adventure and culture...",
      "personalizedAdvice": [
        "Consider booking during sunset hours...",
        "Bring a camera for stunning photo opportunities..."
      ],
      "budgetTips": [
        "Book early for better rates...",
        "Look for package deals..."
      ],
      "bestTimes": [
        "Spring (March-May) for mild weather...",
        "Avoid peak summer crowds..."
      ]
    },
    "metadata": {
      "source": "qloo+openai",
      "location": "Mediterranean",
      "budget": "moderate",
      "model": "gpt-3.5-turbo",
      "tokensUsed": 668
    }
  },
  "timestamp": "2025-07-23T09:55:22.829Z"
}
```

## 🤖 AI Integration Features

### ChatGPT Enhancement
The system now uses OpenAI's ChatGPT to provide:

1. **Smart Summaries** - AI-generated activity descriptions
2. **Personalized Advice** - Context-aware recommendations based on interests
3. **Budget Tips** - Cost-saving suggestions for different budget levels
4. **Best Times** - Intelligent recommendations for optimal timing
5. **Enhanced Activities** - AI-generated activity suggestions with emojis

### Fallback System
- **Primary**: Qloo API + ChatGPT enhancement
- **Secondary**: Qloo API only (if ChatGPT unavailable)
- **Tertiary**: Mock data (if APIs unavailable)

## 🔍 Entity Resolution & Insights System

### Entity Resolution Pipeline
The system now includes advanced entity resolution capabilities:

1. **Intelligent Input Processing** - Convert user interests to Qloo entities
2. **Confidence-based Filtering** - Filter entities by confidence scores
3. **URN Validation** - Validate and normalize entity URNs
4. **Batch Processing** - Efficiently resolve multiple entities
5. **Caching System** - Cache resolved entities for performance

### Insights Aggregation
Advanced insights processing for enhanced recommendations:

1. **Cross-type Analysis** - Analyze relationships between brands, places, tags, and audiences
2. **Taste Profile Generation** - Build comprehensive user preference profiles
3. **Preference Aggregation** - Combine insights from multiple entities
4. **Synergy Calculations** - Calculate cross-type relationship scores
5. **Profile Strength Metrics** - Measure the quality of generated profiles

### URN Registry Management
Robust entity registry system:

1. **URN Validation** - Validate entity URNs against patterns
2. **Registry Synchronization** - Sync with Qloo API registry
3. **Cache Management** - TTL-based caching with automatic refresh
4. **Fallback Registry** - Default URNs when API unavailable
5. **Health Monitoring** - Registry health and performance tracking

### API Testing & Validation
Enhanced API testing capabilities:

1. **API Key Validation** - Test API keys with multiple auth formats
2. **Connectivity Testing** - Verify API connectivity and responses
3. **Error Analysis** - Comprehensive error reporting and analysis
4. **Environment Validation** - Verify environment variable configuration

## 🧪 Testing

### Automated Testing
```bash
# Run all tests
npm test

# Backend unit tests
npm run test:backend

# Frontend component tests
npm run test:frontend

# Full QA automation (recommended)
npm run qa
```

### QA Automation Script

The `npm run qa` command runs comprehensive testing:

1. **Service Startup**: Automatically starts backend (3001) and frontend (3000)
2. **API Testing**: Tests health check and recommendation endpoints
3. **AI Integration**: Validates ChatGPT enhancement functionality
4. **Mock Data Validation**: Verifies fallback system works without API keys
5. **Logging Verification**: Checks Winston logging functionality
6. **Fallback Testing**: Simulates API unavailability scenarios

#### What the QA Script Validates:

✅ **Service Health**
- Backend server responds on port 3001
- Frontend server responds on port 3000
- Both services start within timeout limits

✅ **API Functionality**
- Health endpoint returns 200 OK
- Recommendation endpoint processes requests
- Qloo API integration works correctly
- ChatGPT enhancement provides AI insights
- Response format matches expected schema

✅ **Entity Resolution System**
- Entity resolver processes user input correctly
- URN registry validates and manages entities
- Insights aggregator generates taste profiles
- Cross-type analysis works properly
- Fallback resolution when APIs unavailable

✅ **AI Integration**
- OpenAI API key validation
- ChatGPT enhancement completion
- AI insights generation (summary, advice, tips, timing)
- Token usage tracking
- Fallback when AI is unavailable

✅ **Logging System**
- Winston logs incoming requests
- API usage is logged
- AI enhancement status is tracked
- Entity resolution metrics are captured
- Error scenarios are captured
- Log files are created and populated

✅ **Fallback Mechanisms**
- System works without API keys
- Graceful degradation to mock data
- Error handling doesn't break user experience
- AI enhancement gracefully fails when needed
- Entity resolution falls back to default entities

### Manual Testing Checklist

After running `npm run qa`, perform these manual tests:

1. **Open** `http://localhost:3000` in browser
2. **Select interests**: Adventure, Culture, Dining
3. **Choose location**: Mediterranean
4. **Select budget**: Moderate ($$)
5. **Click**: "Get My Recommendations"

**Expected Results:**
- ✅ Recommendation cards displayed with Qloo data
- ✅ **AI Insights section** with ChatGPT enhancement
- ✅ **Summary** of recommendations
- ✅ **Personalized Advice** (5 items)
- ✅ **Budget Tips** (3 items)
- ✅ **Best Times** (3 items)
- ✅ **AI-Generated Activities** with emojis
- ✅ No console errors in browser
- ✅ Network tab shows successful POST to `/recommend`

## 🛠 Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Logging**: Winston
- **Testing**: Jest + Supertest
- **API Integration**: 
  - Qloo API (recommendations, entity resolution, insights)
  - OpenAI ChatGPT API (AI enhancement)
- **Entity Resolution**: 
  - Entity Resolver Service (intelligent entity resolution)
  - Insights Aggregator (cross-type analysis)
  - URN Registry (entity validation and caching)

### Frontend
- **Framework**: React 18
- **Styling**: CSS3 with Grid/Flexbox
- **HTTP Client**: Fetch API
- **Testing**: React Testing Library + Jest
- **Build Tool**: Create React App

### DevOps
- **CI/CD**: GitHub Actions
- **Testing**: Automated QA scripts
- **Logging**: Structured JSON logs
- **Environment**: Docker-ready configuration

## 🔄 Operating Modes

### 1. Full AI Mode (Production)
- Uses Qloo API for recommendations
- ChatGPT enhancement for AI insights
- Real-time personalization
- Comprehensive logging

### 2. Development Mode
- Uses mock data by default
- Detailed console logging
- Hot reload for both frontend and backend
- CORS enabled for local development

### 3. Fallback Mode
- Automatically activates when APIs are unavailable
- Uses curated mock recommendations
- Maintains full user experience
- Logs fallback usage for monitoring

## 🔑 Environment Configuration

### Required for Production
```env
# API Keys
QLOO_API_KEY=REPLACE_WITH_YOUR_QLOO_API_KEY
OPENAI_API_KEY=REPLACE_WITH_YOUR_OPENAI_API_KEY

# Server Configuration
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
```

### Optional Configuration
```env
# Database (future enhancement)
DATABASE_URL=postgresql://user:password@localhost:5432/cruise_assistant

# External Services
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=https://your-frontend-domain.com
```

## 📊 Performance & Monitoring

### Logging
- **Request/Response**: All API calls logged with timestamps
- **AI Enhancement**: ChatGPT usage and token consumption tracked
- **Error Tracking**: Comprehensive error logging with stack traces
- **Performance**: Response time monitoring
- **Usage Analytics**: User interaction patterns

### Health Monitoring
- **Health Check**: `GET /health` endpoint for uptime monitoring
- **API Status**: `GET /api-status` for integrated services health
- **Service Status**: Automatic service health validation
- **Fallback Tracking**: Mock data usage monitoring

## 🚀 Deployment

### Local Development
```bash
npm run dev          # Start both services
npm run qa           # Run full test suite
```

### Production Build
```bash
npm run build        # Build frontend for production
npm run start:backend # Start production backend
```

### CI/CD Pipeline
- **Triggers**: Push to main/develop branches, Pull Requests
- **Tests**: Automated unit and integration tests
- **Build**: Frontend build artifacts
- **Deploy**: Automatic deployment on main branch

## 🔮 Roadmap

### Phase 2: Enhanced Entity Resolution (Completed ✅)
- [x] Advanced entity resolution system
- [x] Cross-type insights aggregation
- [x] URN registry management
- [x] Enhanced API testing and validation

### Phase 3: Advanced AI Features (Next)
- [ ] Advanced personalization with user profiles
- [ ] Real-time pricing integration
- [ ] Multi-language support
- [ ] Voice assistant integration

### Phase 4: User Experience
- [ ] User authentication and profiles
- [ ] Save favorite recommendations
- [ ] Recommendation history
- [ ] Social sharing features

### Phase 5: Advanced Features
- [ ] Real-time pricing integration
- [ ] Booking system integration
- [ ] Push notifications
- [ ] Mobile app development

### Phase 6: Analytics & AI
- [ ] User behavior analytics
- [ ] Machine learning recommendations
- [ ] A/B testing framework
- [ ] Advanced personalization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run qa`)
4. Commit changes (`git commit -m 'Add amazing feature'`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add tests for new features
- Update documentation as needed
- Ensure QA script passes before submitting PR

## 📄 License

MIT License - see LICENSE file for details.

## 📞 Support

- **Issues**: Create GitHub issues for bugs and feature requests
- **Documentation**: Check this README and inline code comments
- **Testing**: Use `npm run qa` for comprehensive validation

---

**Built with ❤️ and AI for cruise enthusiasts worldwide** 🌊🤖