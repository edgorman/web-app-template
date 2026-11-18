# services/backend

The Go API on Cloud Run. `README.md` here has the API, configuration, how to run it locally, and how to add a resource by copying `notes`. Reasoning for each rule is in the linked record under `docs/decisions/`.

## Access Control

- Every resource and action is a line in `internal/entity/access.go`'s policy table, with one of two modes: public or private. An undeclared pair is refused ([3](../../docs/decisions/0003-one-access-policy-table.md)).
- No roles ([3](../../docs/decisions/0003-one-access-policy-table.md)).
- A refused read is a `404`, not a `403` (see `README.md`).

## Adding a Resource

- Copy the `notes` slice end to end: the paths and schemas in `packages/api/openapi.yaml`, entity, repository interface, Firestore adapter, handlers, tests, and a composite index in `infrastructure/env/firestore.tf` for any query that filters and orders on different fields (`README.md`'s "Adding a resource").
- Validate through entity setters; a repository calls `Validate` before every write and never trusts what it was handed.
- A resource an account owns is erased by `DELETE /users/me`.

## Rate Limiting

- Every route is behind the per-IP budget, and every write behind the per-account one. A route that calls something paid gets its own, tighter budget.
- Rate-limit buckets are per instance, so Cloud Run is capped at one (`backend_max_instances` in `infrastructure/env/variables.tf`). Move the counters to a shared store before raising the cap.

## Container image

- `services/backend:image` builds the Dockerfile with `COMMIT_SHA`; CI builds it on every PR but only publishes on merge ([6](../../docs/decisions/0006-hand-declared-moon-graph.md)).
- A second binary goes under `cmd/`, built from the same Dockerfile with `CMD=<name>`, as its own moon project, an image matrix leg in `push-commit.yaml` and `push-release.yaml`, and a `publish` marker ([6](../../docs/decisions/0006-hand-declared-moon-graph.md), [12](../../docs/decisions/0012-build-only-what-changed.md)).
