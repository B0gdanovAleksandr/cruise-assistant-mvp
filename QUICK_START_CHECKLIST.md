# ⚡ Quick Start Checklist for Real RAG Testing

## 🎯 What You Need for Real Tests

### ✅ Essential Requirements
- [ ] **OpenAI API Key** (`sk-...`)
- [ ] **Pinecone API Key** 
- [ ] **Pinecone Index** (dimensions=3072 for text-embedding-3-large)
- [ ] **Pinecone Environment** (e.g., `us-west1-gcp`)
- [ ] **Node.js 18+** installed
- [ ] **npm** package manager
- [ ] **Internet connection** for API calls

### 💰 Budget Requirements
- [ ] **OpenAI credits** (~$5-15 per test run)
- [ ] **Pinecone credits** (~$2-5 per test run)
- [ ] **Total budget**: ~$7-20 per complete test run

## 🚀 3-Step Quick Start

### Step 1: Setup Environment
```bash
# 1. Copy environment template
cp env.example .env

# 2. Edit with your API keys
nano .env

# 3. Install dependencies
npm install
```

### Step 2: Check Readiness
```bash
# Run comprehensive readiness check
node scripts/check-readiness.js
```

### Step 3: Run All Tests
```bash
# Single command to run everything
node scripts/run-real-tests.js
```

## 📋 Environment Variables Checklist

### Required Variables
```bash
# OpenAI
OPENAI_API_KEY=sk-your-key-here

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=your-index-name
PINECONE_ENVIRONMENT=us-west1-gcp
```

### Optional Variables (Recommended)
```bash
# Phase 1: Embedding model
EMBEDDING_MODEL=text-embedding-3-large

# Phase 2: Reranking
USE_RERANKING=true
RERANKING_TYPE=hybrid
RERANKING_MODEL=gpt-4

# Phase 3: Production features
ENABLE_MONITORING=true
ENABLE_ALERTING=true
ENABLE_CACHING=true
CACHE_TTL=3600000
```

## 🔍 Troubleshooting Quick Fixes

### Common Issues & Solutions

| Issue | Quick Fix |
|-------|-----------|
| `OPENAI_API_KEY missing` | Add your OpenAI API key to `.env` |
| `Pinecone index not found` | Create index with dimensions=3072 |
| `Rate limit exceeded` | Wait 1 minute and retry |
| `Memory heap out of memory` | Run: `node --max-old-space-size=4096 scripts/run-real-tests.js` |
| `Module not found` | Run: `npm install` |

### Debug Commands
```bash
# Check environment variables
node -e "require('dotenv').config(); console.log('OpenAI:', process.env.OPENAI_API_KEY ? 'SET' : 'MISSING')"

# Test API connectivity
node scripts/check-readiness.js

# Run with debug logging
DEBUG=* node scripts/run-real-tests.js
```

## 📊 Expected Timeline

### Test Duration
- **Phase 1**: 2-3 minutes
- **Phase 2**: 3-4 minutes  
- **Phase 3**: 2-3 minutes
- **Total**: 7-10 minutes

### Cost Breakdown
- **Embeddings**: ~$2-5
- **GPT-4 calls**: ~$3-10
- **Pinecone**: ~$2-5
- **Total**: ~$7-20

## 🎯 Success Indicators

### Green Flags ✅
- All phases pass without errors
- Response time <3 seconds
- Citation accuracy >90%
- Cache hit rate >50%

### Red Flags ❌
- API key errors
- Connection timeouts
- Memory issues
- Rate limiting errors

## 📞 Need Help?

### Quick Support
1. **Check logs**: `cat backend/logs/real-test-report.json`
2. **Run diagnostics**: `node scripts/check-readiness.js`
3. **Review errors**: Check console output for specific error messages

### Common Solutions
- **API issues**: Verify keys and quotas
- **Network issues**: Check internet connection
- **Memory issues**: Increase Node.js memory limit
- **Rate limits**: Wait and retry

## 🎉 Success!

When everything works:
```bash
# You'll see:
🎉 All phases passed! RAG system is production-ready!
📊 All phases passed successfully
🚀 Ready for deployment
```

---

**Ready? Start here:** `node scripts/run-real-tests.js` 🚀 