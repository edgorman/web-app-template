# 30. Releases come from release-please

Status: Accepted (supersedes [16](0016-pre-release-gates.md) and [18](0018-versions-from-conventional-commits.md); amends [15](0015-build-once-promote-by-sha.md) and [17](0017-manual-prod-infrastructure-apply.md))

## Context

Every merge cut a GitHub pre-release, and production was deployed by editing one into a full release. That meant a version computed by a small pre-1.0 action, run twice and read back through an `awk` parse of its log; a releases page full of versions that never reached production; and a promotion that was a UI edit with no review and no view of what was about to ship.

## Decision

[release-please](https://github.com/googleapis/release-please) owns versions and releases, and merging its release PR is the promotion to production.

- **Every merge to `main`** applies root and staging infrastructure, builds and publishes both artifacts by commit SHA ([29](0029-build-every-merge.md)), deploys staging and runs the smoke test. Then `release-please` (which waits on all of those, `if: always() && <each direct need> == 'success'`) opens or updates one release PR holding the next version and the changelog, computed from the Conventional Commit subjects the `pr-title` check enforces. `plan-prod` posts the prod Terraform plan on that PR.
- **Merging the release PR** is a merge to `main`, so the same jobs run for that commit. `release-please` then creates the tag and the GitHub release, and `promote` calls `promote-release.yaml`, which applies prod Terraform and deploys the backend and frontend by that commit's SHA from prod's own stores. Nothing is rebuilt ([15](0015-build-once-promote-by-sha.md)). A release is therefore only ever cut for a commit that is live and healthy on staging with its artifacts in both stores.
- **Rollback**, or finishing a promotion whose deploy failed, is `promote-release.yaml` run by hand (`workflow_dispatch`) with a release tag: the same flow with that release's infrastructure, image and folder.
- **Tags** are `vMAJOR.MINOR.PATCH`. release-please bumps `feat:` minor and `fix:` patch, a breaking change (`!` or `BREAKING CHANGE:`) major; while the major version is 0 a breaking change bumps minor. Unlike the action it replaces, `chore:`, `docs:`, `ci:` and the like do not by themselves call for a release.
- **Token.** A PR opened with the default `GITHUB_TOKEN` does not trigger the PR checks, so release-please runs with the personal access token already stored in Secret Manager as `github_provider_token`, which therefore also needs Contents and Pull requests read/write ([20](0020-workload-identity-federation.md)).
- **Files.** `.github/release-please-config.json` and `.github/.release-please-manifest.json` hold the configuration, starting at `0.0.0`; `CHANGELOG.md` at the repository root is maintained by each release PR, and release-please keeps its version in `.github/version.txt`. None of these is a language manifest, so the root-manifest rule ([1](0001-manifests-live-with-their-code.md)) is unaffected.
- **Staging** runs a commit, not a release, so its footer shows the short SHA; production shows the release tag.
- `apply-infrastructure-prod.yaml` stays as the manual backfill ([17](0017-manual-prod-infrastructure-apply.md)), and shares the promotion's concurrency group.

## Consequences

The releases page lists only versions deployed to production. Promotion is reviewable: the release PR carries the changelog and the plan. A failed deploy after the release is cut leaves a release that is not live, and is finished by running Promote Release with its tag.
