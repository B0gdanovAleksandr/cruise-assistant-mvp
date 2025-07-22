# 🚀 Deployment Guide

## Git Repository Setup

### 1. Push to GitHub Repository

```bash
# Add your GitHub repository as remote origin
git remote add origin https://github.com/yourusername/cruise-assistant-mvp.git

# Push main branch and tags
git push -u origin main
git push origin --tags
```

### 2. Repository Settings

After pushing to GitHub:

1. **Enable GitHub Actions**
   - Go to repository Settings → Actions
   - Enable "Allow all actions and reusable workflows"

2. **Set up Branch Protection** (recommended)
   - Go to Settings → Branches
   - Add rule for `main` branch
   - Enable "Require status checks to pass before merging"
   - Enable "Require pull request reviews before merging"

3. **Configure Secrets** (for future API integration)
   - Go to Settings → Secrets and variables → Actions
   - Add secrets for:
     - `QLOO_API_KEY`
     - `OPENAI_API_KEY`

## Local Development Setup

### Quick Start
```bash
git clone https://github.com/yourusername/cruise-assistant-mvp.git
cd cruise-assistant-mvp
npm run install:all
npm run qa  # Run full test suite
npm run dev # Start development servers
```

### Verification Checklist

Before pushing changes:

- [ ] `npm run qa` passes all tests
- [ ] Frontend loads at http://localhost:3000
- [ ] Backend responds at http://localhost:3001
- [ ] Recommendations display correctly
- [ ] No console errors in browser
- [ ] All tests pass (`npm test`)

## Production Deployment

### Environment Variables Required

```env
# Required for production
QLOO_API_KEY=your_qloo_api_key
OPENAI_API_KEY=your_openai_api_key
NODE_ENV=production
PORT=3001

# Optional
LOG_LEVEL=info
CORS_ORIGIN=https://your-domain.com
```

### Build Commands

```bash
# Install dependencies
npm run install:all

# Run tests
npm test

# Build frontend
npm run build

# Start production server
npm run start:backend
```

### Health Check

Production deployment should respond to:
- `GET /health` - Backend health check
- `GET /` - API information

## CI/CD Pipeline

The GitHub Actions workflow automatically:

1. **On Pull Request**:
   - Installs dependencies
   - Runs all tests
   - Builds frontend
   - Validates code quality

2. **On Main Branch Push**:
   - Runs full test suite
   - Creates build artifacts
   - Deploys to staging (when configured)

3. **On Tag Push**:
   - Creates release
   - Deploys to production (when configured)

## Monitoring

### Logs Location
- **Development**: `backend/logs/combined.log`
- **Production**: Configure external log aggregation

### Key Metrics to Monitor
- API response times
- Error rates
- Mock data usage (indicates API issues)
- User interaction patterns

## Next Steps

1. **API Integration**: Add real Qloo and OpenAI API keys
2. **Database**: Set up PostgreSQL for user data
3. **Authentication**: Implement user login system
4. **Monitoring**: Set up application monitoring
5. **CDN**: Configure CDN for frontend assets

## Support

- **Issues**: Create GitHub issues for bugs
- **Documentation**: Check README.md
- **Testing**: Use `npm run qa` for validation