# 🔧 Requirements for Real Testing

## 📋 Что нужно для реальных тестов

### 1. API Keys и Environment Variables

#### OpenAI API:
```bash
# Обязательно для всех фаз
OPENAI_API_KEY=sk-...  # API ключ OpenAI
```

#### Pinecone (Vector Database):
```bash
# Обязательно для Phase 1-3
PINECONE_API_KEY=...   # API ключ Pinecone
PINECONE_INDEX_NAME=... # Название индекса
PINECONE_ENVIRONMENT=... # Environment (us-west1-gcp, etc.)
```

#### Дополнительные настройки:
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

### 2. Данные для тестирования

#### Events Data:
```javascript
// Нужны реальные события для индексации
const sampleEvents = [
  {
    id: 'event_001',
    title: 'Mediterranean Cultural Tour',
    type: 'excursion',
    description: 'Explore ancient ruins and local culture...',
    tags: ['culture', 'history', 'mediterranean'],
    experienceAffinity: 0.8
  },
  // Минимум 50-100 событий для качественного тестирования
];
```

#### User Preferences:
```javascript
// Разнообразные пользовательские предпочтения
const testUserPrefs = [
  {
    interests: ['culture', 'history'],
    location: 'Mediterranean'
  },
  {
    interests: ['wellness', 'spa'],
    location: 'Caribbean'
  },
  // Минимум 10-20 различных профилей
];
```

### 3. Инфраструктура

#### Vector Database Setup:
- ✅ Pinecone индекс создан и настроен
- ✅ Правильные dimensions (3072 для text-embedding-3-large)
- ✅ Достаточно места для хранения векторов

#### Storage для логов:
```bash
# Создать директории для логов
mkdir -p backend/logs
mkdir -p backend/coverage
```

### 4. Зависимости

#### Проверить package.json:
```bash
# Убедиться что все зависимости установлены
npm install

# Проверить что все модули доступны
node -e "console.log('All modules loaded successfully')"
```

## 🚀 Пошаговый план для реальных тестов

### Шаг 1: Подготовка Environment
```bash
# 1. Создать .env файл
cp env.example .env

# 2. Заполнить API ключи
nano .env

# 3. Проверить что все переменные загружаются
node -e "
require('dotenv').config();
console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'SET' : 'MISSING');
console.log('Pinecone API Key:', process.env.PINECONE_API_KEY ? 'SET' : 'MISSING');
"
```

### Шаг 2: Подготовка данных
```bash
# 1. Создать скрипт для загрузки тестовых данных
node scripts/prepare-test-data.js

# 2. Индексировать события в Pinecone
node scripts/index-test-events.js
```

### Шаг 3: Запуск реальных тестов
```bash
# Phase 1: Core improvements
node scripts/test-phase1-improvements.js

# Phase 2: Advanced features  
node scripts/test-phase2-improvements.js

# Phase 3: Production optimization
node scripts/test-phase3-improvements.js
```

## 📊 Ожидаемые результаты реальных тестов

### Phase 1 Tests:
- ✅ Embedding generation с text-embedding-3-large
- ✅ Real API calls к OpenAI
- ✅ Vector storage в Pinecone
- ✅ Hallucination detection с реальными данными

### Phase 2 Tests:
- ✅ Chunking реальных событий
- ✅ Reranking с LLM scoring
- ✅ Synthetic dataset с реальными метриками

### Phase 3 Tests:
- ✅ Real performance metrics
- ✅ Actual cache hit rates
- ✅ Live monitoring data
- ✅ Real alert generation

## 💰 Стоимость тестирования

### OpenAI API Costs:
- **Embeddings**: ~$0.0001 per 1K tokens
- **GPT-4 calls**: ~$0.03 per 1K tokens
- **Estimated cost per test run**: $5-15

### Pinecone Costs:
- **Vector storage**: ~$0.10 per 1K vectors
- **Query operations**: ~$0.01 per 1K queries
- **Estimated cost per test run**: $2-5

### Total estimated cost: $7-20 per complete test run

## 🔍 Что мы получим от реальных тестов

### 1. Реальные метрики производительности
- Actual response times
- Real cache hit rates
- True API latency

### 2. Качественные результаты
- Real precision/recall scores
- Actual hallucination rates
- True faithfulness metrics

### 3. Production insights
- Real monitoring data
- Actual alert patterns
- True system reliability

### 4. Validation данных
- Confirmation что все работает в production
- Real-world performance baselines
- Actual cost analysis

## 🚨 Потенциальные проблемы

### 1. API Limits:
- OpenAI rate limits
- Pinecone query limits
- Cost overruns

### 2. Data Quality:
- Insufficient test data
- Poor data variety
- Inconsistent formatting

### 3. Infrastructure:
- Network connectivity issues
- Database connection problems
- Memory/CPU constraints

## ✅ Checklist для готовности

### Environment:
- [ ] OPENAI_API_KEY настроен
- [ ] PINECONE_API_KEY настроен
- [ ] Все environment variables заполнены
- [ ] .env файл создан и настроен

### Data:
- [ ] Тестовые события подготовлены (50+)
- [ ] User preferences созданы (10+)
- [ ] Pinecone индекс создан
- [ ] Данные проиндексированы

### Infrastructure:
- [ ] Все зависимости установлены
- [ ] Логи директории созданы
- [ ] Достаточно места на диске
- [ ] Стабильное интернет соединение

### Budget:
- [ ] OpenAI credits доступны
- [ ] Pinecone credits доступны
- [ ] Budget на тестирование выделен

## 🎯 Рекомендации

### 1. Начните с малого:
```bash
# Сначала протестируйте только Phase 1
node scripts/test-phase1-improvements.js
```

### 2. Мониторьте costs:
```bash
# Следите за использованием API
# Установите лимиты в OpenAI dashboard
```

### 3. Сохраняйте результаты:
```bash
# Сохраняйте все результаты тестов
# Создавайте baseline метрики
```

### 4. Итеративный подход:
```bash
# Тестируйте по одной фазе
# Анализируйте результаты
# Оптимизируйте перед следующей фазой
```

## 📞 Следующие шаги

1. **Подготовить API keys**
2. **Создать тестовые данные**
3. **Настроить environment**
4. **Запустить Phase 1 тесты**
5. **Анализировать результаты**
6. **Продолжить с Phase 2 и 3**

**Готовы к реальным тестам?** 🚀 