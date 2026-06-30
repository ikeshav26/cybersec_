# CyberSuite

**CyberSuite** is an AI-powered repository security monitoring and vulnerability remediation platform. Built using a modern **microservices architecture** inside a monorepo, it enables users to authenticate via GitHub, sync repositories, run vulnerability scans, apply AI-generated security patches, and stage remediations directly via automated Pull Requests.

---

## Project Structure

```text
├── apps/
│   └── web-2/                      # React + Vite + Tailwind CSS frontend dashboard
├── services/
│   ├── api-gateway/                # Reverse proxy, rate limiting, and route orchestration
│   ├── auth-service/               # User profiles, GitHub OAuth, and session tokens
│   ├── app-integration-service/    # GitHub App installations and repository syncing
│   └── secure-bot/                 # AI vulnerability scanner & PR patch generator
├── terraform/                      # Infrastructure provisioning scripts (DigitalOcean)
├── ansible/                        # Automated server deployment and setup playbooks
└── .github/workflows/              # GitHub Actions CI/CD (release tagging and CD deployments)
```

---

## Technical Stack

### Frontend (`apps/web-2`)
- **Core:** React 19, TypeScript, Vite
- **Styling:** Tailwind CSS (v4), Glassmorphic custom design
- **State & Routing:** Zustand, React Router DOM
- **Animations:** GSAP (GreenSock Animation Platform)

### Backend Services (`services/*`)
- **Runtime & Framework:** Node.js, Express, TypeScript
- **Queuing & Cache:** BullMQ (job queuing), Redis (state/cache)
- **Database:** PostgreSQL (isolated via schema namespaces `auth`, `integration`, `bot`)
- **Database Client:** Prisma ORM
- **API Clients & Security:** Octokit (GitHub API integration), Gemini AI & OpenRouter (patch generation)

### Third-Party Scanners
- **Security Checkers:** Semgrep, Gitleaks, Trivy (run inside transient containers)

### Infrastructure & Deployment
- **Infra Provisioning:** Terraform (Droplets, DNS entries)
- **Deployment Automation:** Ansible (packages, env config, SSL, migrations, and compose setups)
- **Containerization:** Docker & Docker Compose (multi-container isolation)
- **Web Server:** Nginx (acting as a reverse proxy) with Certbot SSL certificates
- **CI/CD:** GitHub Actions (automating package version bumps and trigger-based Ansible deploys)

---

## Services Overview

### 1. API Gateway (`services/api-gateway`)
Orchestrates incoming client traffic. It manages routing, JWT authorization checks, and rate-limiting policies via Redis before proxying requests to downstream microservices.

### 2. Authentication Service (`services/auth-service`)
Handles GitHub OAuth verification, session cookie management, and stores user profiles in the Postgres `auth` schema namespace.

### 3. App Integration Service (`services/app-integration-service`)
Interfaces with the GitHub App installation flow, retrieves repository access scopes, and manages metadata mappings within the Postgres `integration` schema namespace.

### 4. Secure Bot (`services/secure-bot`)
The core security agent. It processes repository scan requests asynchronously via **BullMQ** job queues. When a task is picked up by a scan worker:
- It pulls target source code, runs Semgrep/Gitleaks/Trivy scanners.
- It uses Gemini AI to analyze warnings and generate secure code patches.
- It commits/pushes remediation branches and automatically opens GitHub Pull Requests.

---

## Architectural Highlights

- **Monorepo Management:** Monorepo using `pnpm` workspaces for local development and shared configuration dependencies.
- **Database Isolation:** Single PostgreSQL instance running a **Database-per-Service** isolation model using PostgreSQL schema namespaces (`auth`, `integration`, and `bot`).
- **Token-based Security:** Enforces shared JWT verification across service layers to protect inter-service requests and authorize user sessions.
