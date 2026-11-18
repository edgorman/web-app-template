# 4. The debug endpoint contract

## Context

A deployment is only known to work when DNS, CORS, environment variables and IAM all work across both clouds, and a green unit-test run proves none of that.

## Decision

The backend's `/health` and `/debug` return status, timestamp, environment and commit SHA (`internal/service/debug.go`). The GCP uptime check ([24](0024-monitoring-on-cloud-run-metrics.md)) polls `/health` and matches the literal `"status":"ok"` substring, and the staging smoke test ([8](0008-moon-gates-every-ci-job.md)) exercises the deployed pair.

## Consequences

`/health` and `/debug` are declared in the spec like every other route ([2](0002-openapi-is-the-api-contract.md)), and the commit SHA in `/debug` is the one the image was built from.
