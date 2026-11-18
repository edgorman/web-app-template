# 13. Releases come from release-please

## Context

Production should receive a reviewed, versioned change, not whatever the last merge happened to be. A release should be cut only for a commit whose artifacts exist in both stores and that is live and healthy on staging, and the version should come from the Conventional Commit subjects every squash-merged PR already carries (`.github/settings.yml`).

## Decision

[release-please](https://github.com/googleapis/release-please) owns versions and releases, and merging its release PR is the promotion to production.

- **Every merge to `main`** applies root and staging infrastructure, builds what changed and publishes both artifacts by commit SHA ([12](0012-build-only-what-changed.md)), deploys staging and runs the smoke test. Then `release-please` (which waits on all of those and checks each direct need for `success`, never a bare `needs:`) opens or updates one release PR holding the next version and the changelog, computed from the Conventional Commit subjects the `pr-title` check enforces. `plan-prod` posts the prod Terraform plan on that PR.
- **Merging the release PR** is a merge to `main` whose commit changes only the release files, so it runs `push-release.yaml` ([14](0014-release-commits-have-their-own-workflow.md)). It first checks that the previous commit's `push-commit.yaml` run succeeded, so a release is only cut for a commit that was healthy on staging. `release-please` then creates the tag and the GitHub release, and `promote` calls `promote-release.yaml`, which applies prod Terraform and deploys the backend and frontend by that commit's SHA from prod's own stores. Nothing is rebuilt ([11](0011-build-once-promote-by-sha.md)).
- **Rollback**, or finishing a promotion whose deploy failed, is `promote-release.yaml` run by hand (`workflow_dispatch`) with a release tag: the same flow with that release's infrastructure, image and folder.
- **Tags** are `vMAJOR.MINOR.PATCH`. `feat:` bumps minor, `fix:` patch, a breaking change (`!` or `BREAKING CHANGE:`) major; while the major version is 0 a breaking change bumps minor. `build:`, `chore:`, `ci:`, `docs:` and `refactor:` also bump patch (`changelog-sections` lists them as visible), so every change that can alter what runs, Renovate's `build(deps):` bumps included, gets a release PR; release-please skips a commit type it hides. `style:` and `test:` do not call for a release. The `pr-title` check enforces the format.
- **Token.** A PR opened with the default `GITHUB_TOKEN` does not trigger the PR checks, so release-please runs with the personal access token stored in Secret Manager as `github_provider_token`. That token therefore also needs Contents and Pull requests read/write, and is readable only by the deploy identity ([21](0021-plan-and-apply-identities.md)).
- **Files.** `.github/release-please-config.json` and `.github/.release-please-manifest.json` hold the configuration, starting at `0.0.0`; `CHANGELOG.md` at the repository root is maintained by each release PR. None is a language manifest, so [1](0001-manifests-live-with-their-code.md) is unaffected.
- **Staging** runs a commit, not a release, so its footer shows the short SHA, linked to the commit; production shows the release tag.
- `apply-infrastructure-prod.yaml` is the manual backfill ([15](0015-manual-prod-infrastructure-apply.md)), and shares the promotion's concurrency group.

## Consequences

The releases page lists only versions deployed to production. Promotion is reviewable: the release PR carries the changelog and the plan. A failed deploy after the release is cut leaves a release that is not live, and is finished by running Promote Release with its tag.
