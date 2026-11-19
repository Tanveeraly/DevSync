# Deployment

| Part      | Where                                      | Pipeline                          |
|-----------|--------------------------------------------|-----------------------------------|
| Backend   | AWS EC2 (Docker Compose: API + Caddy)      | `.github/workflows/backend.yml`  |
| Database  | Neon (managed serverless Postgres)         | migrations run on each deploy    |
| Frontend  | Vercel                                     | `.github/workflows/frontend.yml` |

```
Browser ─► Vercel (Next.js) ── rewrite /api/v1/* ─► https://API_DOMAIN ─► Caddy ─► FastAPI ─► Neon Postgres
   └──────────── WebSocket (wss://API_DOMAIN) ───────────┘   (EC2 instance)            (TLS)
```

**How the pipelines run**

- The pipelines run **only on a push to `main`**, for example when you merge `develop` into `main`. Pushes to `develop` and other branches, and pull requests, trigger nothing.
- Backend: tests run, then the image is built and pushed to GHCR, then it's deployed to EC2 (`alembic upgrade head` runs before the restart).
- Frontend: lint and build, then a deploy to Vercel production.
- Each workflow only runs when files in its own folder change. You can also start one by hand from **Actions → Run workflow** on `main`.

---

## 0. Neon (one time)

1. Create a project at neon.tech. **Choose the AWS region closest to your EC2 instance**, ideally the same one (e.g. both `ap-southeast-1`). Every query crosses the network, so region matters.
2. Go to **Dashboard → Connect** and **turn the "Connection pooling" toggle OFF** to get the *direct* host (no `-pooler` in the hostname). The API keeps its own connection pool, and Neon's pooler (PgBouncer in transaction mode) breaks asyncpg's prepared statements.
3. Copy the connection string as-is into `DATABASE_URL` (step 1.6). The app rewrites `postgresql://…?sslmode=require&channel_binding=require` into the asyncpg form automatically.
4. Free-plan notes:
   - The compute suspends after about 5 minutes idle, so the first request after a pause is slower by roughly 0.5–1 s. `pool_pre_ping` reconnects automatically.
   - Storage is capped at 0.5 GB per project.
   - For backups, use Neon's point-in-time restore or create a branch before risky migrations.

## 1. AWS (one time)

1. **Launch an EC2 instance.** In the EC2 console, launch an instance with:
   - AMI: **Ubuntu Server 24.04 LTS (x86_64)**
   - Type: **t3.micro** (or whichever x86 type is marked *Free tier eligible* for your account). The image is built for amd64, so don't pick a Graviton type such as t4g.
   - Storage: 20–30 GB gp3
   - Key pair: create one and download the `.pem`
2. **Security group, inbound rules:**
   - 22/tcp: SSH. GitHub Actions runners use changing IPs, so this needs to be open to `0.0.0.0/0`. Key-only auth is the default on Ubuntu.
   - 80/tcp from `0.0.0.0/0`: needed for the Let's Encrypt challenge.
   - 443/tcp from `0.0.0.0/0`: HTTPS API.
3. **Elastic IP.** Allocate one and associate it with the instance so the IP survives restarts.
4. **Pick an API hostname.** If you have no domain, use sslip.io: an Elastic IP of `13.234.10.20` becomes `api.13-234-10-20.sslip.io`. If you have a domain, add an `A` record pointing at the Elastic IP.
5. **Bootstrap the server** (Git Bash on your machine):
   ```bash
   scp -i devsync.pem deploy/setup-ec2.sh ubuntu@<ELASTIC_IP>:~
   ssh -i devsync.pem ubuntu@<ELASTIC_IP> 'bash setup-ec2.sh'
   ```
6. **Create the production env file on the server:**
   ```bash
   scp -i devsync.pem deploy/.env.production.example ubuntu@<ELASTIC_IP>:~/devsync/.env
   ssh -i devsync.pem ubuntu@<ELASTIC_IP>
   nano ~/devsync/.env      # fill in every value
   chmod 600 ~/devsync/.env
   ```
   `ENCRYPTION_KEY` must be exactly 32 characters. Don't change it once real data exists, or stored GitHub tokens can no longer be decrypted.

## 2. Vercel (one time)

1. Import the GitHub repo in Vercel. Framework: **Next.js**. **Root Directory: `frontend`**.
2. Under **Settings → Environment Variables**, set these for Production and Preview:
   | Name | Value |
   |------|-------|
   | `BACKEND_URL` | `https://api.13-234-10-20.sslip.io` |
   | `NEXT_PUBLIC_WS_URL` | `wss://api.13-234-10-20.sslip.io` |

   Leave `NEXT_PUBLIC_API_URL` **unset**. Requests then go through the `/api/v1` proxy, which keeps login cookies working.
3. `frontend/vercel.json` turns off Vercel's own Git auto-deploys, so GitHub Actions is the only thing that deploys.
4. Create an access token at vercel.com/account/tokens.
5. Get the org and project IDs: run `npx vercel link` in the repo root, then read `.vercel/project.json` (`orgId`, `projectId`). Don't commit `.vercel/`.
6. Copy your production URL (e.g. `https://devsync.vercel.app`) into `FRONTEND_URL` and `CORS_ORIGINS` in the server's `.env`.

## 3. GitHub (one time)

**Settings → Secrets and variables → Actions → New repository secret:**

| Secret | Value |
|--------|-------|
| `EC2_HOST` | Elastic IP |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Full contents of `devsync.pem` |
| `API_URL` | `https://api.13-234-10-20.sslip.io` (used for the post-deploy health check) |
| `VERCEL_TOKEN` | Vercel token |
| `VERCEL_ORG_ID` | `orgId` |
| `VERCEL_PROJECT_ID` | `projectId` |

`GITHUB_TOKEN` is provided automatically and is used to push and pull the image on GHCR.
Optional: under **Settings → Environments → production**, add required reviewers to approve each production deploy.

## 4. GitHub OAuth app

In GitHub → Settings → Developer settings → OAuth Apps, set:
- Homepage URL: `https://<your-app>.vercel.app`
- Callback URL: `https://<your-app>.vercel.app/api/v1/github/callback`. This goes through the Vercel proxy, and it must match `GITHUB_REDIRECT_URI` in the server `.env`.

## 5. First deploy

Merge `develop` into `main` and push. Watch the **Actions** tab. Then open:
- `https://API_DOMAIN/docs` for the API
- `https://<your-app>.vercel.app` for the app

---

## Operations

Run these after `ssh ubuntu@<ELASTIC_IP>` and `cd ~/devsync`:

```bash
docker compose ps                         # status
docker compose logs -f api                # API logs
docker compose logs caddy                 # TLS / proxy issues
docker compose run --rm --no-deps api alembic current   # migration state on Neon

# Roll back to an older image (tags are the first 12 chars of the commit SHA)
API_IMAGE=ghcr.io/<owner>/devsync-backend:<sha> docker compose up -d api
```

**Notes**
- The API runs as a **single uvicorn worker** on purpose. The WebSocket manager keeps state in memory, so multiple workers would split rooms between them.
- If the GHCR package is private, the deploy job still pulls it with its own token. Pulling by hand on the server needs `docker login ghcr.io` with a PAT that has `read:packages`.
- Database backups and browsing live in the Neon console (SQL Editor, Branches, Restore).
- CI tests still use a throwaway Postgres container. They never touch Neon.
