# Развертывание на Render.com

## 🚀 Пошаговая инструкция

### 1. Подготовка репозитория

Убедитесь, что ваш код находится в GitHub репозитории.

### 2. Создание аккаунта на Render.com

1. Перейдите на [render.com](https://render.com)
2. Зарегистрируйтесь через GitHub
3. Подключите ваш репозиторий

### 3. Создание Web Service

#### Вариант A: Единый сервис (рекомендуется)

1. **Нажмите "New +" → "Web Service"**
2. **Подключите репозиторий**
3. **Настройки:**
   - **Name:** `cruise-assistant`
   - **Environment:** `Docker`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Root Directory:** оставьте пустым
   - **Dockerfile Path:** `Dockerfile.render`
   - **Docker Context:** оставьте пустым

4. **Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   LOG_LEVEL=info
   QLOO_API_KEY=ваш_qloo_api_key
   OPENAI_API_KEY=ваш_openai_api_key
   ```

5. **Нажмите "Create Web Service"**

#### Вариант B: Отдельные сервисы

Создайте два отдельных сервиса:

**Backend Service:**
- **Name:** `cruise-assistant-backend`
- **Environment:** `Docker`
- **Dockerfile Path:** `backend/Dockerfile`
- **Docker Context:** `backend`

**Frontend Service:**
- **Name:** `cruise-assistant-frontend`
- **Environment:** `Docker`
- **Dockerfile Path:** `frontend/Dockerfile`
- **Docker Context:** `frontend`
- **Environment Variable:** `REACT_APP_API_URL=https://cruise-assistant-backend.onrender.com`

### 4. Настройка переменных окружения

В настройках сервиса добавьте:

```
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
QLOO_API_KEY=ваш_qloo_api_key
OPENAI_API_KEY=ваш_openai_api_key
```

### 5. Автоматическое развертывание

После настройки Render автоматически:
1. Соберет Docker образ
2. Развернет приложение
3. Предоставит публичный URL

### 6. Проверка развертывания

После успешного развертывания вы получите URL вида:
`https://cruise-assistant.onrender.com`

### 7. Тестирование

1. Откройте URL в браузере
2. Проверьте API: `https://cruise-assistant.onrender.com/health`
3. Протестируйте функциональность

## 🔧 Устранение проблем

### Ошибка сборки

Если возникает ошибка сборки:

1. **Проверьте логи сборки** в Render Dashboard
2. **Убедитесь, что все файлы** находятся в правильных директориях
3. **Проверьте переменные окружения**

### Ошибка запуска

1. **Проверьте логи приложения**
2. **Убедитесь, что API ключи** правильно настроены
3. **Проверьте порты** (Render использует переменную `PORT`)

### Проблемы с API

1. **Проверьте CORS настройки**
2. **Убедитесь, что frontend** правильно обращается к backend
3. **Проверьте переменную `REACT_APP_API_URL`**

## 📝 Полезные команды

### Локальное тестирование с Render-подобной конфигурацией

```bash
# Сборка образа
docker build -f Dockerfile.render -t cruise-assistant .

# Запуск контейнера
docker run -p 80:80 -p 3001:3001 \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e QLOO_API_KEY=ваш_ключ \
  -e OPENAI_API_KEY=ваш_ключ \
  cruise-assistant
```

## 🌐 Публичная ссылка

После успешного развертывания вы получите публичный URL, который можно отправить для тестирования:

```
https://cruise-assistant.onrender.com
```

Этот URL будет доступен из любой точки мира! 