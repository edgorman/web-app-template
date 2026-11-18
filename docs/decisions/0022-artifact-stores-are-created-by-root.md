# 22. Artifact stores are created by root, one set per environment

## Context

A shared store copied between environments would mean a cross-project read or a copy at promotion time. And since every merge publishes into every environment's stores ([11](0011-build-once-promote-by-sha.md)) while env Terraform only reaches prod on promotion, stores created by env Terraform would not exist in prod when the first merge, or the first merge after a store is added, tries to write to them.

## Decision

- Each environment project has its own Artifact Registry `backend` repository and its own `<gcp-project-id>-frontend` bucket (bucket names are global, so they are named after the project). Each store is written once, by the job that builds and validates the artifact, and read only from within its own project.
- `infrastructure/root/artifact_stores.tf` creates them, with the CI deploy identity's writer grants on both and the Artifact Registry API, for every project in `gcp_projects`. Retention ([23](0023-artifact-retention.md)) and its variables live there too, so a change to retention shows in root's plan.
- Root applies before staging on every merge it is affected by, and on a repository's first, so every environment's stores exist before anything publishes into them. The service jobs wait on root's apply having succeeded or skipped.
- The rule: anything a merge writes into every environment belongs in root. Env Terraform keeps what only its own environment's apply, deploy or promotion touches (Cloud Run, Firestore, monitoring).

## Consequences

A merge never depends on prod having been promoted, so the manual prod apply ([15](0015-manual-prod-infrastructure-apply.md)) is left for per-environment resources that aren't stores.
