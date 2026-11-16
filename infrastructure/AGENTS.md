# infrastructure

Terraform roots: `env` (applied per environment from `config/staging` and `config/prod`) and `root` (shared, bootstrapped once). How they are planned and applied is in `.github/AGENTS.md`. Reasoning for each rule is in the linked record under `docs/decisions/`.

## Cloud Infrastructure & Security Isolation

- Staging and prod are separate GCP projects (`<prefix>-stag`, `<prefix>-prod`), and every resource carries its environment suffix (`backend-stag`) ([19](../docs/decisions/0019-one-gcp-project-per-environment.md)).

### Root Environment

- `infrastructure/root` owns the root project, both environment projects, every state bucket, every environment's artifact stores, the WIF pool and provider, shared DNS, the baseline APIs and the GitHub Actions variables the workflows read. Its first apply is the only manual one (`docs/new-repo.md`); everything after goes through CI ([19](../docs/decisions/0019-one-gcp-project-per-environment.md)).

### IAM & Authentication

- CI authenticates with Workload Identity Federation. No JSON keys, and roles are granted per project, never at org level ([32](../docs/decisions/0032-separate-plan-and-apply-identities.md)).
- Four identities, none holding more than its job needs: `github-plan` (read-only, any run in the repository, used by the PR checks), `github-deploy` (`push-commit.yaml` on `main`), `github-promote` (`promote-release.yaml` and `apply-infrastructure-prod.yaml` on `main`, prod only) and `github-renovate` (`renovate.yaml` on `main`, the PAT secret only). A workflow picks its identity from `PLAN_`, `DEPLOY_`, `PROMOTE_` or `RENOVATE_SERVICE_ACCOUNT`, and a new workflow that needs an apply identity is added to its `workloadIdentityUser` binding in `github_cicd.tf` ([32](../docs/decisions/0032-separate-plan-and-apply-identities.md)).
- Nothing the plan identity can read may be a credential: PR plans use placeholder tokens and `-refresh=false`, and the plan identity has no Secret Manager access ([32](../docs/decisions/0032-separate-plan-and-apply-identities.md)).
- Workflows read the WIF provider, service accounts, project ids, region and site URLs from repository variables written by root; never hardcode them, and add a new one to `github_cicd.tf`'s `actions_variables` ([32](../docs/decisions/0032-separate-plan-and-apply-identities.md)).
- The GitHub PAT and the Cloudflare token live in Secret Manager (`github_provider_token`, `cloudflare_api_token`), never in a GitHub secret, and are readable only by the identities that apply ([32](../docs/decisions/0032-separate-plan-and-apply-identities.md)).

### Artifact Stores

- Each environment has its own registry (`backend`) and bucket (`<gcp-project-id>-frontend`), written once by the job that built the artifact and read only within that project ([21](../docs/decisions/0021-per-environment-artifact-stores.md)).
- Root creates them (`root/artifact_stores.tf`), because every merge writes to every environment's stores and env only reaches prod on promotion. Anything a merge writes into every environment goes in root, never env ([27](../docs/decisions/0027-artifact-stores-in-root.md)).
- Retention: keep the newest `backend_registry_keep_count` versions per image plus every `release-` tag; delete frontend folders after `frontend_retention_days`. Both stay dry-run until the output is reviewed ([22](../docs/decisions/0022-artifact-retention.md)).

## Monitoring & Alerting

- Watch both environments with the same `env/monitoring.tf`; alert on Cloud Run metrics, not log-based ones, except for a route that spends money ([23](../docs/decisions/0023-monitoring-on-cloud-run-metrics.md)).
- The uptime check matches `"status":"ok"` on `/health` every 15 minutes ([23](../docs/decisions/0023-monitoring-on-cloud-run-metrics.md)).
- A log-based metric's filter and the log message it matches change together ([23](../docs/decisions/0023-monitoring-on-cloud-run-metrics.md)).
- Every threshold is a variable in `env/variables.tf` with a default and description, and every policy has a `documentation` block ([23](../docs/decisions/0023-monitoring-on-cloud-run-metrics.md)).
