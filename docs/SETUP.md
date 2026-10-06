# Setup and deployment

## Native development

Use Python 3.12 and Node 22.13 or newer. Run commands from the repository root. On Windows use PowerShell's `.venv\Scripts\Activate.ps1` in place of the shell activation command.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements-dev.txt
python -m pip install --index-url https://download.pytorch.org/whl/cpu torch==2.14.0
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
docker compose up -d postgres redis
alembic -c backend/alembic.ini upgrade head
```

Use three terminals with the same environment and checkout:

```bash
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-proxy-headers
```

```bash
celery -A backend.app.worker.celery worker --loglevel=INFO --concurrency=1
```

```bash
pnpm dev:next
```

Linux/macOS supports the default Celery process pool. For local Windows experimentation use `--pool=solo`; Docker/Linux is preferred for deployment. The original D1/R2 Sentinel workspace is hosted-only. Standalone mode deliberately rejects untrusted ChatGPT identity headers; use email/password research accounts locally.

## Environment

| Setting | Meaning |
|---|---|
| `SCIENCE_API_URL` | Fixed server-side FastAPI base URL; the browser uses `/api/science/*` |
| `DATABASE_URL` | SQLAlchemy `postgresql+psycopg` URL; SQLite is test-only |
| `REDIS_URL` | Celery broker/backend and rate-limit Redis |
| `STORAGE_DIR`, `MODEL_DIR` | Persistent absolute paths shared by API and worker |
| `ALLOWED_ORIGINS` | Comma-separated exact frontend origins for write protection |
| `FRONTEND_URL` | Canonical origin used in password-reset emails |
| `SESSION_SECURE` | `true` for HTTPS; `false` only for local plain HTTP |
| `SESSION_HOURS` | Cookie and server-session lifetime, default 24 hours |
| `MAX_UPLOAD_MB`, `MAX_RASTER_PIXELS` | Per-file compressed and decompressed limits |
| `SMTP_*` | STARTTLS email transport for password resets |
| `TESTING` | Always `false` outside the isolated test process |

A missing SMTP transport returns an explicit unavailable response. It does not pretend an email was sent. The health endpoint checks the database migration and PostGIS, not worker capacity or every third-party provider.

## Remote hosting and connecting the published frontend

Deploy the Python API, worker, PostgreSQL/PostGIS and Redis on a machine/platform that supports persistent storage and scientific Python. A Cloudflare Worker cannot execute this PyTorch/Rasterio service. Keep Redis and PostgreSQL on a private network and expose the API through HTTPS. Back up PostgreSQL and the shared `data` volume together.

Set `ALLOWED_ORIGINS` and `FRONTEND_URL` to the frontend's exact HTTPS origin, and `SESSION_SECURE=true`. Configure the published frontend's server-side `SCIENCE_API_URL` with the reachable HTTPS API origin. Do not put database credentials, cookies or the API setting into `NEXT_PUBLIC_*` variables. The proxy forwards only the research session cookie, not the hosted ChatGPT cookie.

For a self-hosted Next.js frontend, use `docker/Dockerfile.frontend` or `pnpm build:next` followed by `pnpm start:next`. Keep `SPACE_EYE_STANDALONE=true`; this disables trust in Sites-only identity headers. Set the API URL in the frontend process environment before startup. The original `/workspace` remains tied to the hosted D1/R2 environment.

## Storage, jobs and recovery

Reconstruction uses disk-backed sum/weight arrays, roughly 16 bytes per output pixel, plus GeoTIFF products. A 100-million-pixel limit is a ceiling, not a recommended job size. Provision several times the scene size in free disk and monitor storage growth. One worker process is the default. There is no automatic disk quota or retention job.

A worker claims a queued analysis atomically. Duplicate delivery cannot process it twice. An abrupt worker termination may leave a claimed analysis active. Stop the owning worker, verify it is no longer processing the job, and run:

```bash
python -m scripts.recover_job ANALYSIS_ID --worker-stopped
```

This marks the stale run failed. Submit a new analysis; do not reuse or overwrite its output directory. Failed intermediate files can be archived or removed by the operator after inspection. Automatic job cancellation/resume is not implemented.

## GPU

The supplied image is CPU-only. For GPU training/inference, install a PyTorch build matching the host's CUDA driver in a separate Linux environment, provide GPU access to the worker and rerun the tests. The code selects CUDA when available; GPU execution was not verified in delivery. CUDA results may differ numerically from CPU despite a recorded seed.
