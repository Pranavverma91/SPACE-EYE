# SPACE EYE

**Generative AI-Based Cloud Removal and Surface Reconstruction for LISS-IV Satellite Imagery**

A final-year research platform with a Next.js interface, FastAPI processing API, PostgreSQL/PostGIS records, Redis/Celery jobs, Rasterio geospatial processing and PyTorch training. It uses uploaded observations and measured outputs. It contains no seeded analyses, fabricated accuracy scores or pretrained cloud-removal weights.

## What is included

- Public Earth visualization, login/signup/reset flows and protected research workspace.
- Geographic place search, imagery metadata search, labeled maps, globe/terrain views, rectangle/polygon AOIs and GeoJSON/KML polygon import.
- GeoTIFF upload, band mapping, metadata/CRS inspection and stored acquisition dates.
- Experimental cloud/shadow detection or an explicit class mask, overlapping patches, clear-pixel preservation, spatial and temporal baselines.
- Trainable ResUNet, conditional GAN, conditional DDPM and optical/temporal/SAR attention DDPM. Neural models remain unavailable until compatible weights are registered.
- Comparison swipe/blink, synchronized result maps, pixel spectra, NDVI, reference differences and actual evaluation metrics.
- Cloud-Optimized GeoTIFF reconstruction, GeoTIFF masks/indices, metadata JSON and a printable HTML research report.
- Dataset inventory, analysis history, model registry and measured training-run history.
- The original hosted Sentinel-2 observation workspace at `/workspace`, with its existing ChatGPT sign-in and D1/R2 archive.

**Hosting boundary:** the hosted Site serves the interface and original Sentinel workspace. Python processing requires a separately deployed API/worker stack and the server-side `SCIENCE_API_URL` setting. Until connected, research operations report that the service is unavailable. This repository includes that stack; it does not claim a running Python server or trained LISS-IV model on the published Site.

## Run the full research stack

Install Docker with Compose, copy the environment template, then start the services:

```bash
cp .env.example .env
docker compose up --build
```

Open http://localhost:3000 and create a **research account**. The API documentation is at http://localhost:8000/docs. Compose creates PostGIS, Redis, the schema migration, API, one worker and the standalone Next.js frontend. The first image build downloads the scientific libraries and CPU PyTorch. Set a unique `POSTGRES_PASSWORD` before hosting; choose a URL-safe password or percent-encode it in a manually supplied database URL.

Docker startup was authored but could not be executed in the delivery environment. See [validation](docs/VALIDATION.md) for exactly what was tested and [setup](docs/SETUP.md) for native development, GPU and remote hosting instructions. No data is deleted by `docker compose down`; avoid `down -v` unless you intend to remove the stored database and observations.

## First real analysis

1. Open **New analysis** and upload your licensed, georeferenced cloudy image. Confirm Green, Red and NIR band indices against its product metadata.
2. Optionally upload a class mask: `0` clear, `1` cloud, `2` shadow. Its nodata pixels must not overlap valid processing pixels.
3. Select **Spatial interpolation** for a baseline without weights, or **Temporal replacement** with a calibrated, aligned same-sensor optical observation. Spatial interpolation fails when a patch has no usable clear context.
4. Set an AOI if needed and run the analysis. Jobs display actual processing stages; the worker must be running.
5. Inspect the output and download its provenance. Add a genuine paired reference for accuracy metrics. A different-date reference is a comparison, not ground truth.

Use the [training guide](docs/TRAINING.md) to prepare disjoint scenes, train and register neural checkpoints. An all-cloud scene cannot reveal the true surface from the optical image alone. Reconstruction estimates must be reviewed before use.

## Repository layout

| Directory | Responsibility |
|---|---|
| `frontend/app/` | Next routes, protected pages and server API proxy |
| `frontend/components/` | Research UI, reusable primitives and preserved Sentinel UI |
| `frontend/lib/` | Typed API client, trusted session adapters and existing observation logic |
| `backend/app/` | FastAPI authentication, ownership, GeoTIFF processing and Celery jobs |
| `backend/alembic/` | Frozen PostgreSQL/PostGIS migration and six model definitions |
| `ai/` | Detection, metrics, architectures, inference and training |
| `scripts/` | Dataset preparation, synthetic contamination, model registration, recovery and original Sites build tools |
| `data/` | Documented runtime directories; private imagery and weights are ignored by git |
| `research/` | Methodology, evaluation protocol and source references |
| `docker/` | CPU processing and standalone frontend images |
| `docs/` | Setup, architecture, training, validation, asset credits and handover |

Root `app`, `components`, `lib`, `hooks`, `public` and `vendor` are compatibility symlinks into `frontend/`; the package manager remains at the repository root. A Windows extractor must preserve symlinks, or recreate them with `node scripts/materialize-frontend-links.mjs` before installing. Do not maintain duplicate copies manually.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:frontend
pnpm verify
pnpm verify:access
pnpm build:next
python -m pytest -q
alembic -c backend/alembic.ini upgrade head --sql
```

Install the Python environment first as described in the setup guide. `pnpm build` is the separate Sites/Cloudflare build and requires its runtime tooling. Do not set `SPACE_EYE_STANDALONE=true` for the Sites build. `pnpm dev:next` and `pnpm build:next` set the flag for local Next.js automatically.

The project is a functioning research implementation, not a published benchmark or validated operational cloud-removal service. Its boundaries are documented in [methodology](research/METHODOLOGY.md).
