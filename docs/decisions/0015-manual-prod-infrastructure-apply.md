# 15. A manual prod apply, for backfilling only

## Context

Staging applies on every merge, prod only on promotion, so prod state can lag `main`. A merge-time job that depends on a per-environment resource other than the artifact stores ([22](0022-artifact-stores-are-created-by-root.md)) would fail if prod hasn't been promoted past the PR that added it.

## Decision

`apply-infrastructure-prod.yaml` (**Apply Prod Infrastructure (Manual)**, `workflow_dispatch`) runs only `terraform apply` on prod, with no release. It requires typing `apply`, runs as the promote identity ([21](0021-plan-and-apply-identities.md)) and shares Promote Release's concurrency group.

## Consequences

It is not the normal path. Prod infrastructure changes through a promotion, whose plan is visible on the release PR. Use this only to backfill a new per-environment resource a merge is about to depend on, and say so in that PR.
