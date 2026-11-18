# 11. Build once, promote by commit SHA

## Context

Production should run exactly the bytes validated in staging, and a rollback should never depend on rebuilding an old commit.

## Decision

- Every commit on `main` has a backend image (one per binary under `cmd/`) and a frontend `dist/` published by commit SHA, never the version, to both the staging and prod stores. A merge builds what it changed and republishes the rest ([12](0012-build-only-what-changed.md)); a release commit publishes its predecessor's ([14](0014-release-commits-have-their-own-workflow.md)). A merge whose run is cancelled while pending gets none; the next run covers its infrastructure.
- The frontend is a plain `dist/` with no backend URL baked in, uploaded under `<commit-sha>/` to both frontend buckets. Staging deploys from that same `dist/`.
- The backend URL, the site's name and canonical URL, and the version are runtime configuration: `frontend-deploy` writes `config.json` next to the fetched folder (`services/frontend/src/lib/config.ts`), so the stored folder stays environment-neutral.
- Promoting a release ([13](0013-releases-from-release-please.md)) runs, in order: `terraform apply` on prod, `gcloud run deploy` of `backend:<commit-sha>` from prod's own registry, then the frontend folder from prod's own bucket (`frontend-fetch`) to Cloudflare Workers with `config.json`. No cross-project read, no copy, no rebuild.
- Promotion also tags each backend image `release-<version>`, for retention only ([23](0023-artifact-retention.md)). Nothing deploys by it.
- Rollback is promoting an earlier tag: the same flow, with that release's infrastructure, image and folder, all already in place.

## Consequences

A store's size tracks merges, not deploys, which is why retention exists. Between the backend and frontend steps a new backend serves the old bundle, so wire changes are additive ([2](0002-openapi-is-the-api-contract.md)).
