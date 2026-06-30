# Secure Bot Service (secure-bot)

The **Secure Bot Service** is responsible for triggering security scans on user repositories, managing scan status and vulnerability findings, and calling Gemini AI to generate automated code fixes.

---

## 1. Database Configuration

* **PostgreSQL Schema:** `bot` (isolated using the connection parameter `?schema=bot` or the adapter `{ schema: 'bot' }`).
* **ORM:** Prisma Client with `@prisma/adapter-pg`.

### Models:
```prisma
model Scan {
  id           String      @id @default(uuid())
  repositoryId String
  status       ScanStatus  @default(QUEUED)
  branch       String?
  commitHash   String?
  error        String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  findings     Finding[]

  @@map("scans")
}

model Finding {
  id          String        @id @default(uuid())
  scanId      String
  scan        Scan          @relation(fields: [scanId], references: [id], onDelete: Cascade)
  tool        ToolType
  severity    Severity
  status      FindingStatus @default(OPEN)
  title       String
  description String
  filePath    String
  line        Int?
  rawDetails  Json
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@map("findings")
}
```

---

## 2. Background Queue & Scanners (BullMQ)

The **Secure Bot** uses **BullMQ** (powered by **Redis**) to handle resource-heavy repository cloning and security analysis asynchronously in the background.

1. **Queuing:** When a user requests a scan, a scan job containing the repository coordinates is pushed to the Redis-backed BullMQ `scan-queue`.
2. **Workers:** A background thread worker (`scan.worker.ts`) polls the queue, obtains the job, and starts cloning the repository locally.
3. **Scanners:** The worker runs three automated security scanners:
   - **Gitleaks:** Checks for exposed secrets/keys in the codebase.
   - **Semgrep:** Scans for code pattern vulnerabilities (SQL injection, XSS, insecure dependencies).
   - **Trivy:** Analyzes package lockfiles for known CVEs.
4. **AI Processing:** The bot compiles the findings, passes the vulnerable code contexts to the **Gemini AI / OpenRouter** APIs, generates explanations and code diff fixes, and updates the scan status in the `bot` database schema.

---

## 3. API Endpoints

### `POST /api/secure-bot/scan/repo/:id`
Initiates a new security scan for the given repository.
* **Authentication:** Required (`userAuth`).
* **Behavior:**
  1. Validates repository access with the App Integration Service.
  2. Creates a new `Scan` record in the database with status `QUEUED`.
  3. Pushes a job to the Redis/BullMQ background task queue to process the repository cloning and analysis.

### `GET /api/secure-bot/scan/status/:scanId`
Retrieves the status of an ongoing or completed scan along with all identified security findings.
* **Authentication:** Required (`userAuth`).

### `DELETE /api/secure-bot/scan/delete/data/:repoId`
Deletes all scans and associated findings records for a given repository.
* **Authentication:** Required (`userAuth`).

### `POST /api/secure-bot/fix/finding/:findingId`
Fetches a single-finding code patch and explanation using Gemini AI.
* **Authentication:** Required (`userAuth`).
* **Behavior:** Retrieves the file context around the vulnerable line, invokes Gemini AI to generate a fixed code snippet and remediation explanation, and returns the suggested changes to the client.

### `POST /api/secure-bot/fix/findings`
Applies bulk fixes for a batch of multiple findings.
* **Authentication:** Required (`userAuth`).
* **Request Body:**
  ```json
  {
    "findingIds": ["finding-id-1", "finding-id-2"]
  }
  ```

---

## 3. Frontend Integration (Single Finding Fixes)

The Next.js dashboard visualizes single finding fixes directly on the screen inside the findings modal:
* **Interactive Suggestions:** Clicking **Auto Fix** fetches the suggestion from the API and opens a details panel under the finding card.
* **Explanation & Code Snippets:** Displays the Gemini-generated reasoning text and a high-contrast monospace code block.
* **Instant Clipboard Utility:** A **Copy Code** button is built in to quickly copy code changes.
* **Smart Toggle State:** Visibility state is managed locally in the frontend browser cache so users can collapse (**Hide Fix Details**) and expand (**View Fix Details**) without triggering redundant, slow Gemini API requests.
