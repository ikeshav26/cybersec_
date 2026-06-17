# Authentication Service (auth-service)

The **Authentication Service** is responsible for user registration, login, session management, and storing core user profiles. It authenticates users using **GitHub OAuth** via Passport.js and issues JSON Web Tokens (JWTs).

---

## 1. Database Configuration

* **PostgreSQL Schema:** `auth` (isolated using the connection parameter `?schema=auth` in `.env`).
* **ORM:** Prisma Client with `@prisma/adapter-pg`.

### User Model:
```prisma
model User {
  id             String   @id @default(uuid())
  githubId       String   @unique
  email          String   @unique
  username       String   @unique
  installationID String?  @unique // Stores the GitHub App Installation ID if available
  name           String?
  avatar         String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 2. API Endpoints

### `GET /api/auth/github`
Initiates the GitHub OAuth login flow. If the user is logging in directly after installing the GitHub App, the frontend can pass an optional `installation_id` query parameter (e.g., `?installation_id=123456`), which Passport passes along.

### `GET /api/auth/github/callback`
GitHub redirects users here after authorization.
1. Passport retrieves the user's public profile (email, username, avatar).
2. It checks for a query parameter `installation_id`.
3. If `installation_id` is present and the user already exists, it updates their `installationID` in the database.
4. If the user doesn't exist, it creates a new `User` record with the `installationID`.
5. Generates a signed JWT token containing the user's database ID (`{ id: user.id }`).
6. Redirects the user back to the Next.js frontend (`CLIENT_URL` e.g., `http://localhost:3000`) with parameters:
   ```text
   /?oauth=success&token=<jwt_token>&user=<url_encoded_user_json>
   ```

---

## 3. Configuration Variables (`.env`)

* `PORT`: Server port (default `5000`).
* `DATABASE_URL`: Connection string pointing to the Postgres DB with `?schema=auth`.
* `GITHUB_CLIENT_ID`: GitHub OAuth App Client ID.
* `GITHUB_CLIENT_SECRET`: GitHub OAuth App Client Secret.
* `CLIENT_URL`: The frontend URL (default `http://localhost:3000`).
* `JWT_SECRET`: Secret key used to sign the user tokens.
