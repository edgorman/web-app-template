# 34. Dependency updates come from self-hosted Renovate

Status: Accepted

## Context

Dependabot's version updates covered GitHub Actions, Terraform providers, npm and Go modules, but not the pins outside those formats: the Dockerfile's base images, `.prototools`, the Terraform version repeated across files, the tools CI installs with `go install` or `pip`, and wrangler. They drifted or were synced by hand, and a coupled bump (Go in `.prototools`, `go.mod` and the Dockerfile) arrived as a failing PR that needed manual follow-up.

## Decision

- Renovate runs from `renovate.yaml`, a scheduled (weekly) and manually dispatchable workflow in the repository itself, not the hosted Mend app, so a repository made from the template needs nothing outside its own files and the PAT it already has. Its config is `.github/renovate.json5`, and `dependabot.yml` is removed; Dependabot alerts and security updates stay on.
- It runs with the `github_provider_token` PAT, so its PRs trigger the PR checks (one opened with `GITHUB_TOKEN` would not), as the `github-renovate` identity, which can read that one secret and nothing else, because the job runs a third-party action ([32](0032-separate-plan-and-apply-identities.md)).
- One grouped PR per ecosystem (`ci-deps`, `terraform-deps`, `npm-deps`, `gomod-deps`, `docker-deps`, `tool-deps`), the same labels as before, titled `build(deps): ...` so the `pr-title` check passes. Docker base images are pinned by digest. A pin that lives in several files moves in one PR: Go (`.prototools`, `go.mod`, the Dockerfile) and the Terraform version.
- A hand-written pin Renovate would not otherwise see carries a `# renovate: datasource=... depName=...` comment on the line above, which one regex manager reads: `.prototools`, the tools installed in `security.yaml`, `oasdiff` in `packages/api/moon.yml`, wrangler, and the proto version in the session hook.
- Where a version was repeated only because nothing read the single source, it now does: the Terraform actions and the session hook read `.prototools`, and the hook checks the download against the release's own `SHA256SUMS`.
- The one pin still hand-written is the Firestore emulator jar in `pull-request.yaml`, whose checksum comes from elsewhere.

## Consequences

- The PAT needs Workflows, Issues and Commit statuses read/write as well as what Terraform and release-please use ([30](0030-releases-from-release-please.md)), so one token now holds Contents and Workflows write. Only the deploy and renovate identities can read it. On a free private repository with no branch protection, that token could also push to `main`; Renovate itself only pushes branches.
- GitHub pauses a scheduled workflow after 60 days without repository activity; running Renovate by hand restarts it.
