# API Gateway Service (api-gateway)

The **API Gateway Service** is the entrypoint for all incoming client traffic. It manages CORS configuration, request header sanitization, session authorization, and applies rate-limiting policies before proxying requests to downstream microservices.

---

## 1. Proxy Routing

The gateway uses Express and proxy middleware (like `http-proxy-middleware` or custom routing handlers) to forward incoming HTTP requests:

- `/api/auth/*` ➔ Proxied to **Authentication Service** (`auth-service`)
- `/api/app-integration/*` ➔ Proxied to **App Integration Service** (`app-integration-service`)
- `/api/secure-bot/*` ➔ Proxied to **Secure Bot Service** (`secure-bot`)

---

## 2. Rate Limiting Middleware

To prevent API abuse and protect expensive third-party APIs (like Gemini AI / OpenRouter), the gateway implements strict rate-limiting middlewares backed by Redis:

- **Scan Limiter (`scanLimiter`):** Restricts the frequency of repository scan requests.
- **Fix Limiter (`fixLimiter`):** Restricts the frequency of automated security fix/remediation generation requests.

---

## 3. Configuration Variables (`.env.prod`)

- `PORT`: Server port (default `5003`).
- `CLIENT_URL`: Trusted frontend origin for CORS policies.
- `REDIS_URL`: Redis server connection URL (e.g. `redis://redis:6379`).
- `JWT_SECRET`: Secret key used for local session authorization validations.
- `AUTH_SERVICE_URL`: URL of the downstream authentication service container.
- `APP_INTEGRATION_SERVICE_URL`: URL of the downstream app integration service container.
- `SECURE_BOT_SERVICE_URL`: URL of the downstream secure bot service container.
