# 31. Applies re-plan instead of applying a saved plan

Status: Accepted (supersedes [25](0025-apply-saved-plans.md))

## Context

[25](0025-apply-saved-plans.md) applied the plan a `pull_request` job had saved to `gs://<state-bucket>/plans/<env>/<tree-hash>.tfplan`, so an apply was the plan a reviewer saw. That job ran on a branch with credentials able to write the bucket, so anyone able to push a branch could upload a crafted plan under the tree hash of an approved PR, and the merge would apply it if state had not moved. The reviewed plan and the applied plan were the same only by convention.

## Decision

- `terraform-push-commit` plans and applies in one job, from the commit it runs for. Nothing is read from a plan another job wrote: the `plan_dir` input, the saved-plan download and its staleness fallback are gone, and so are the `plans/` lifecycle rules on the state buckets.
- `terraform-pull-request` still plans and comments on the PR, which stays the reviewed reference, but saves nothing. The plan identity therefore needs no write access to the state buckets ([20](0020-workload-identity-federation.md)).
- Each apply writes its plan to the job summary, and a plan with nothing to apply is skipped.
- For production, the plan is posted on the release PR ([30](0030-releases-from-release-please.md)) and the promotion re-plans.

## Consequences

What is applied is planned from the merged commit, so it can differ from the PR comment if state, or `main`, moved in between; the apply's job summary shows what was actually applied. Every apply costs one plan.
