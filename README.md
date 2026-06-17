# CyberSuite

**CyberSuite** is an AI-powered repository security monitoring and vulnerability remediation platform. Built using a modern **microservices architecture** inside a **Turborepo monorepo**, the project enables users to authenticate via GitHub, connect their repositories, automatically scan their codebase for vulnerabilities using Gemini AI, and apply patches directly via automated Pull Requests.

---

## Project Architecture & Directory Structure

The project is structured as a monorepo containing multiple independent services and frontend applications:

```text
├── apps/
│   └── web/                        # Next.js frontend application (Testing Dashboard)
├── services/
│   ├── auth-service/               # Service for user profiles, GitHub OAuth, and session tokens
│   ├── app-integration-service/    # Service for GitHub App installation and repository syncing
│   └── secure-bot/                 # Service for AI vulnerability scanning, cloning, and PR patching
├── packages/                       # Shared configurations (TypeScript, ESLint, UI UI stub library)
└── docs/                           # Detailed service flows and documentation
```

---

## Services Overview

### 1. Web Application (`apps/web`)
A Next.js frontend application featuring a dark mode glassmorphic dashboard. It serves as the visual testing interface, handling successful OAuth redirects, linking user sessions to GitHub App installations, triggering repository sync tasks on the integration service, and displaying active, protected code repositories.

### 2. Authentication Service (`services/auth-service`)
An Express microservice that manages user identity, GitHub OAuth verification, and authentication cookies/tokens. It connects to the Postgres database using a dedicated `auth` schema namespace to store user profiles and track installation mappings.

### 3. App Integration Service (`services/app-integration-service`)
An Express microservice that connects to the database via a dedicated `integration` schema namespace. It manages the registration of GitHub App installations and interacts with the GitHub API using Octokit to fetch and sync the list of repositories accessible to the app.

### 4. Secure Bot (`services/secure-bot`)
The core security agent that automates vulnerability detection and fixing. When a repository scan is requested:
* It obtains credentials and locally clones the target repository.
* It parses code files and passes them to the Gemini AI API for security auditing.
* It programmatically applies suggested security patches, creates remediation git branches, and opens automated Pull Requests.

---

## Architectural Highlights

* **Monorepo Management:** Powered by Turborepo and `pnpm` workspace workspaces for fast, parallelized builds and local development.
* **Database Isolation:** Utilizes a single PostgreSQL instance but enforces a **Database-per-Service** isolation model using PostgreSQL schema namespaces (`auth` and `integration`), avoiding migration conflicts while maintaining strict service boundaries.
* **Token-based Security:** Enforces shared JWT verification across service layers to protect inter-service requests and authorize user sessions.
