# App Integration Service (app-integration-service)

The **App Integration Service** is responsible for managing GitHub App installations and syncing/managing the user's selected repositories.

---

## 1. Database Configuration

* **PostgreSQL Schema:** `integration` (isolated using connection parameter `?schema=integration` in `.env`).
* **ORM:** Prisma Client with `@prisma/adapter-pg`.

### Models:
```prisma
model Installation {
  id             String       @id @default(uuid())
  installationId String       @unique      // Numeric GitHub App Installation ID
  userId         String                    // Links to User.id from auth-service
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  repositories   Repository[]
}

model Repository {
  id             String @id @default(uuid())
  repo_name      String @unique            // e.g. "username/repository-name"
  repo_url       String @unique            // e.g. "https://github.com/username/repository-name"
  installationId String                    // Links to local Installation.id UUID
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  
  installation   Installation @relation(fields: [installationId], references: [id])
}
```

---

## 2. Shared Authentication Middleware (`userAuth`)
The service decodes incoming user JWT tokens (either from the `Authorization: Bearer <token>` header or `token` cookie) using the shared `JWT_SECRET` key.
* Extracted User ID is attached to the request: `(req as any).user = { id: userId }`.

---

## 3. API Endpoints

### `POST /api/v1/install/app`
Registers a new installation in the database.
* **Authentication:** Required (`userAuth`).
* **Request Body:**
  ```json
  {
    "installationId": "140871704"
  }
  ```
* **Behavior:** Saves the relation mapping `userId` (from token) to `installationId` (from body).

### `POST /api/v1/sync/repos`
Fetches the user's repositories from GitHub and stores them in the database.
* **Authentication:** Required (`userAuth`).
* **Request Body:** Optional `{ installationId: "140871704" }`.
* **Behavior:**
  1. Looks up the user's `Installation` record in the database.
  2. If not found and `installationId` was passed in the body, it automatically creates the `Installation` record.
  3. Uses the GitHub App App ID and Private Key to obtain an installation-specific `Octokit` client.
  4. Calls the GitHub API `GET /installation/repositories` to fetch all accessible repositories.
  5. Upserts each repository in the `Repository` table, linking it to the local `Installation.id` (UUID).
  6. Returns the list of synced repositories.

---

## 4. Configuration Variables (`.env`)

* `PORT`: Server port (default `5001`).
* `DATABASE_URL`: Connection string pointing to the Postgres DB with `?schema=integration`.
* `JWT_SECRET`: Secret key (must match the `auth-service` secret).
* `GITHUB_APP_ID`: Your GitHub App's App ID.
* `GITHUB_PRIVATE_KEY`: Your GitHub App's private key `.pem` contents (with newlines replaced by `\n`).
