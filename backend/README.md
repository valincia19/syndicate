# VALINCIA SYNDICATE Backend API - Modular Express.js Boilerplate

Backend RESTful API yang **modular**, **scalable**, dan **secure** mengikuti best practice industri untuk deployment di Cloud Hosting Hostinger.

## 🎯 Features

- ✅ **Modular Architecture** - Struktur berbasis fitur (bukan jenis komponen)
- ✅ **Security First** - OWASP Top 10 compliant (CORS, Rate Limiting, Security Headers)
- ✅ **JWT Authentication** - Secure token-based auth dengan bcrypt password hashing
- ✅ **Global Error Handler** - Centralized error handling dengan JSON response yang rapi
- ✅ **Input Validation** - Validasi email, password strength, dan data integrity
- ✅ **Rate Limiting** - Anti-brute force protection
- ✅ **Environment-Based Config** - Secure credential management dengan `.env`

## 📁 Struktur Folder

```
backend/
├── src/
│   ├── config/
│   │   ├── env.js              # Environment configuration & validation
│   │   └── database.js         # PostgreSQL connection pool (pg)
│   │   └── redis.js            # Upstash Redis / memory fallback
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js      # JWT verification & role authorization
│   │   ├── cors.middleware.js      # CORS origin restriction
│   │   ├── security.middleware.js  # Security headers (OWASP)
│   │   ├── rateLimiter.middleware.js # Rate limiting (anti-brute force)
│   │   └── errorHandler.middleware.js # Global error handler
│   │
│   └── modules/
│       └── auth/
│           ├── auth.routes.js      # Route definitions
│           ├── auth.controller.js  # HTTP request handlers
│           ├── auth.service.js     # Business logic (register, login, etc.)
│           └── auth.model.js       # Data schema definition
│
├── index.js                    # Entry point (server setup)
├── package.json
├── .env.example               # Environment variables template
└── .env                       # Actual environment (gitignored)
```

## 🔄 Alur Data (Request Flow)

### 1. **Routes → Controller**
```
Client Request → Route (auth.routes.js) → Controller Method
```
- Routes mendefinisikan endpoint HTTP (GET, POST, dll)
- Routes memanggil controller method yang sesuai
- Routes juga apply middleware (auth, rate limit, dll)

### 2. **Controller → Service**
```
Controller → Service Layer → Business Logic
```
- Controller handle HTTP layer (parse request, send response)
- Controller delegate ke service untuk business logic
- Controller catch errors dan forward ke error handler

### 3. **Service → Model**
```
Service → Model/Database → Data Operations
```
- Service contain business logic (validasi, hashing, token generation)
- Service interact dengan database/model layer
- Service return structured data ke controller

### 4. **Error Handling**
```
Any Error → Global Error Handler → JSON Response
```
- Semua errors (throw, next) di-catch oleh global handler
- Handler format error jadi JSON yang konsisten
- Production mode hide stack trace untuk security

## 🔐 Security Features (OWASP Top 10)

### 1. **Authentication & Authorization**
- ✅ JWT tokens dengan expiration (7 days default)
- ✅ Password hashing dengan bcrypt (12 salt rounds)
- ✅ Role-based access control (RBAC)
- ✅ Token verification di setiap request

### 2. **Input Validation**
- ✅ Email format validation
- ✅ Password strength validation (min 8 chars, uppercase, lowercase, number)
- ✅ Duplicate email check
- ✅ Request body size limit (10MB)

### 3. **Security Headers**
```javascript
X-Frame-Options: DENY                    // Prevent clickjacking
X-Content-Type-Options: nosniff          // Prevent MIME sniffing
X-XSS-Protection: 1; mode=block          // XSS protection
Strict-Transport-Security: max-age=31536000  // HTTPS only (production)
Content-Security-Policy: default-src 'self'  // CSP
Referrer-Policy: no-referrer             // Hide referrer
Permissions-Policy: geolocation=()       // Disable features
```

### 4. **CORS Protection**
- ✅ Origin whitelist dari `.env`
- ✅ Credentials support (cookies, headers)
- ✅ Methods & headers restriction
- ✅ Preflight cache (24 hours)

### 5. **Rate Limiting**
- ✅ Per-IP tracking (100 requests per 15 minutes default)
- ✅ Auto cleanup expired records
- ✅ Retry-After header
- ✅ 429 Too Many Requests response

### 6. **Error Handling**
- ✅ No stack trace in production
- ✅ Consistent JSON error format
- ✅ Specific error messages untuk JWT, validation, dll
- ✅ Graceful shutdown (SIGTERM, SIGINT)

## 🚀 API Endpoints

### Public Routes
```bash
GET  /health                    # Health check
POST /v1/auth/register         # Register new user
POST /v1/auth/login            # Login & get JWT token
```

### Protected Routes (require Authorization header)
```bash
GET  /v1/auth/profile          # Get current user profile
```

## 📝 Environment Variables

```bash
# Server
PORT=5000
NODE_ENV=development

# CORS (comma-separated)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# JWT
JWT_SECRET=your-s...n
# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=vinzhub
DB_USER=postgres
DB_PASSWORD=***
DB_SSL=false
DB_CONNECTION_LIMIT=20
# Redis (Upstash REST)
REDIS_URL=https://...upstash.io
REDIS_TOKEN=***
# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

## 🧪 Testing

### 1. Health Check
```bash
curl http://localhost:5000/health
```

### 2. Register
```bash
curl -X POST http://localhost:5000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### 3. Login
```bash
curl -X POST http://localhost:5000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### 4. Protected Route (with token)
```bash
curl http://localhost:5000/v1/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env dengan credentials yang bener

# Run development server (with auto-reload)
npm run dev

# Run production server
npm start
```

## 📦 Production Deployment (Hostinger)

### 1. Setup `.env` di Hostinger
- Set `NODE_ENV=production`
- Generate JWT_SECRET yang strong (min 32 chars)
- Set `ALLOWED_ORIGINS` ke domain frontend lo
- Setup database credentials

### 2. Database Integration
Real database client sudah terhubung di `src/config/database.js` menggunakan PostgreSQL (`pg` Pool):
```javascript
const { Pool } = require('pg');
const pool = new Pool({ /* host, port, user, password, database, max */ });
```
Untuk multiple instances, gunakan Redis store di rate limiter.

### 3. Rate Limiting untuk Production
Untuk multiple instances, gunakan Redis:
```bash
npm install rate-limit-redis
```

### 4. Process Manager
Gunakan PM2 untuk production:
```bash
npm install -g pm2
pm2 start index.js --name valincia-syndicate-api
pm2 save
pm2 startup
```

## 🔧 Menambah Modul Baru

### 1. Buat folder di `src/modules/`
```bash
src/modules/products/
  ├── products.routes.js
  ├── products.controller.js
  ├── products.service.js
  └── products.model.js
```

### 2. Register routes di `index.js`
```javascript
const productRoutes = require('./src/modules/products/products.routes');
app.use('/v1/products', productRoutes);
```

### 3. Follow the same pattern
- Routes → Controller → Service → Model
- Use AppError untuk custom errors
- Always validate input di service layer

## 📊 Response Format

### Success Response
```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error message"
}
```
> Stack traces hanya muncul di server logs (5xx only), tidak pernah dikirim ke client.

## 🎓 Best Practices Implemented

1. ✅ **Separation of Concerns** - Routes, Controllers, Services, Models terpisah
2. ✅ **Error-First Pattern** - Semua errors di-handle oleh global handler
3. ✅ **Async/Await** - Modern async patterns dengan try-catch
4. ✅ **Environment Variables** - No hardcoded secrets
5. ✅ **Input Validation** - Validate before processing
6. ✅ **Security Headers** - OWASP compliant
7. ✅ **Rate Limiting** - Prevent abuse
8. ✅ **Graceful Shutdown** - Proper cleanup on exit
9. ✅ **Modular Structure** - Easy to scale and maintain
10. ✅ **Consistent API** - Same response format everywhere

## 🚨 Important Notes

- **Database**: PostgreSQL via `pg` connection pool. Pastikan environment variables DB_* sudah benar.
- **Redis**: Upstash REST (opsional). Kalau tidak di-set, rate limiter & cache jalan in-memory.
- **JWT Secret**: Generate strong secret untuk production (min 32 chars)
- **HTTPS**: Always use HTTPS di production (setup SSL certificate)
- **CORS**: Restrict origins ke domain frontend lo aja
- **Rate Limit**: Adjust sesuai kebutuhan traffic lo
- **Logging**: Consider menggunakan Winston/Pino untuk production logging

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js)
- [Helmet.js](https://helmetjs.github.io/)

---

**Built with ❤️ for VALINCIA SYNDICATE - Modular, Scalable, Secure**
