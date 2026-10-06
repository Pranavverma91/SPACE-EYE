# Validation record

Rebuilt source verified on 29 September 2026. Earlier, pruned workspace results were not reused as evidence.

| Check | Observed result |
|---|---|
| Python / pytest | 19 tests passed; actual generated rasters and numerical assertions |
| Frontend / Vitest | 6 tests passed: protected API proxy and authentication/reset UI |
| TypeScript | Passed |
| Next.js standalone production build | Passed |
| Sites/Cloudflare production build | Passed |
| Existing Sentinel analysis verification | Passed: spectral indices, offset correction, masking, malformed inputs and PDF report |
| Existing Sentinel access verification | Passed: missing identity, account isolation, cross-origin writes and safe return paths |
| PostgreSQL migration SQL generation | Passed, including PostGIS geometry/index statements and model definitions |

Python tests exercise a real FastAPI application against isolated SQLite fixtures, not a substituted in-memory API response. The queue dispatch boundary is replaced during tests, and the actual processing function runs synchronously on generated georeferenced fixtures. Tests verify overlapping temporal reconstruction, exact clear-pixel preservation, COG metadata, mask-band mapping, withheld temporal-reference metrics, invalid-mask failure, reprojection, ownership and single-use password resets. Synthetic paired-raster preparation and model registration through the API/worker are also tested. Small training runs exercise all four neural architectures and safe checkpoint loading on CPU. These results establish functional behavior; they are not LISS-IV model accuracy measurements.

## Not executed here

- Docker container startup and a live PostgreSQL/PostGIS + Redis/Celery integration run. These executables/services were unavailable in the authoring environment.
- Live SMTP delivery, GPU training or inference, licensed LISS-IV benchmark evaluation, third-party tile/provider availability and deployed Python processing.
- Current desktop/mobile browser visual QA: the supported browser-control skill was unavailable. No prior screenshot is presented as a screenshot of this rebuilt release.

The compiled pages, component interactions and source checks passed. Browser layout, actual storage/network provisioning and the external Python connection should be checked in the intended deployment environment. Known warnings include an upstream Next.js middleware naming deprecation and upstream raster/HTTP test-library deprecations.
