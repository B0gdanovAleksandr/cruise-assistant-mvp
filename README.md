# 🚢 Cruise Personal Assistant MVP

A personalized cruise travel assistant that provides tailored recommendations based on user interests, location preferences, and budget, enhanced with AI insights from ChatGPT.

## 🎯 Project Status: MVP Complete with AI Integration ✅

**Current Version:** 1.0.0 - MVP with ChatGPT Integration  
**Status:** Production Ready with AI Enhancement  
**Last Updated:** July 23, 2025

### ✅ Completed Features
- [x] Interactive interest selection UI
- [x] Location and budget preference selection
- [x] Qloo API integration for real recommendations
- [x] **ChatGPT API integration for AI-enhanced insights**
- [x] Real-time recommendation filtering
- [x] Responsive design with modern UI
- [x] Comprehensive logging with Winston
- [x] Error handling and graceful fallbacks
- [x] Full test coverage (unit + integration)
- [x] CI/CD pipeline with GitHub Actions
- [x] Automated QA testing scripts

### 🤖 AI Features (New!)
- [x] **AI-Enhanced Recommendations** - ChatGPT provides personalized insights
- [x] **Smart Summaries** - AI-generated activity summaries
- [x] **Personalized Advice** - Context-aware recommendations
- [x] **Budget Tips** - AI-powered cost-saving suggestions
- [x] **Best Times** - Intelligent timing recommendations
- [x] **Fallback System** - Graceful degradation when AI is unavailable

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm 8+
- Git

### Installation

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
# QLOO_API_KEY=your_qloo_api_key_here
# OPENAI_API_KEY=your_openai_api_key_here
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
│   │   │   └── recommendationGenerator.js # Recommendation logic
│   │   ├── mock/
│   │   │   └── qlooMock.json  # Mock recommendation data
│   │   ├── utils/
│   │   │   └── logger.js      # Winston logging setup
│   │   └── __tests__/         # Backend tests
│   ├── logs/                  # Application logs
│   └── package.json
├── frontend/                   # React application
│   ├── src/
│   │   ├── App.jsx            # Main application component
│   │   ├── components/
│   │   │   ├── InterestSelector.jsx
│   │   │   ├── RecommendationsList.jsx
│   │   │   └── GeneratedActivitiesList.jsx
│   │   ├── App.css            # Styling
│   │   └── index.js           # React entry point
│   └── package.json
├── scripts/
│   ├── check_local.sh         # QA automation script
│   └── start_dev.sh           # Development startup script
├── .github/workflows/
│   └── ci-cd.yml              # GitHub Actions pipeline
├── .env.example               # Environment variables template
└── README.md
```

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
- Error scenarios are captured
- Log files are created and populated

✅ **Fallback Mechanisms**
- System works without API keys
- Graceful degradation to mock data
- Error handling doesn't break user experience
- AI enhancement gracefully fails when needed

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
  - Qloo API (recommendations)
  - OpenAI ChatGPT API (AI enhancement)

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
QLOO_API_KEY=your_qloo_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

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

### Phase 2: Enhanced AI Features (Next)
- [ ] Advanced personalization with user profiles
- [ ] Real-time pricing integration
- [ ] Multi-language support
- [ ] Voice assistant integration

### Phase 3: User Experience
- [ ] User authentication and profiles
- [ ] Save favorite recommendations
- [ ] Recommendation history
- [ ] Social sharing features

### Phase 4: Advanced Features
- [ ] Real-time pricing integration
- [ ] Booking system integration
- [ ] Push notifications
- [ ] Mobile app development

### Phase 5: Analytics & AI
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