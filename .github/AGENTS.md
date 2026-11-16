# .github

Workflows, composite actions, repository settings and the moon setup CI runs through. What to do when a PR's checks fail is the `steward` skill (`.claude/skills/steward/SKILL.md`). Reasoning for each rule is in the linked record under `docs/decisions/`.

## CI/CD, Branching, & Release Lifecycle

- Everything builds, tests and deploys through GitHub Actions; infrastructure applies before services update.
- Every job that needs GCP or Cloudflare is skipped while `vars.WORKLOAD_IDENTITY_PROVIDER` is empty (the `changed` jobs and `promote-release.yaml`'s `target` job carry the `if:`, and everything else needs them), so a repository made from the template runs only PR checks until its root bootstrap ([20](../docs/decisions/0020-workload-identity-federation.md)).
- Every pipeline has an environment-scoped concurrency group.
- Shared steps live in composite actions under `.github/actions/`.
- Every apply plans and applies in its own job, from the commit it runs for; nothing reads a plan another job wrote. The PR comment is the reviewed reference, and each apply shows its plan in the job summary ([31](../docs/decisions/0031-replan-at-apply.md)).

### Building with moon

- Every folder under `services/` or `packages/` needs a `moon.yml`; `root:projects-covered` fails otherwise ([12](../docs/decisions/0012-hand-declared-moon-graph.md)).
- Declare `dependsOn` by hand. Affected detection is changed files only, so a task that must react to another project lists it in `inputs` (`project://...`) ([12](../docs/decisions/0012-hand-declared-moon-graph.md)).
- Keep `moon ci`'s targets split one-to-one with the required jobs (`lint-check`, `test`, `api-drift`; `pr-title` and `api-breaking` in `conventions.yaml`) ([12](../docs/decisions/0012-hand-declared-moon-graph.md)).
- `deploy-{root,staging,prod}:plan` are `noop` markers whose `inputs` decide which environments a diff reaches. List every workflow and action an environment uses in its marker, and never set `runInCI: false` on one ([13](../docs/decisions/0013-deploy-markers.md)).
- Pin tool versions only in `.prototools`; keep its `go` pin, `go.mod` and the Dockerfile image in step ([14](../docs/decisions/0014-prototools-pins-the-toolchain.md)).
- No remote cache ([11](../docs/decisions/0011-moon-not-pants.md)).

### Security scanning

- `security.yaml` runs the scanners on PRs, weekly and on demand. They are advisory: findings go to the job summary and a warning, never fail a run, and none is a required check. Run each through `.github/scripts/advisory.sh` so a scanner that can't run still fails, and pin its version ([33](../docs/decisions/0033-advisory-security-scanning.md)).

### Dependency updates

- Renovate (`renovate.yaml`, `.github/renovate.json5`) opens one grouped PR per ecosystem, weekly, with the `github_provider_token` PAT; Dependabot alerts stay on, its version updates are off. A pin Renovate wouldn't see carries a `# renovate: datasource=... depName=...` comment on the line above; a version repeated across files is read from `.prototools` instead of copied ([34](../docs/decisions/0034-self-hosted-renovate.md)).

### Versioning

- release-please computes versions from Conventional Commit subjects; tags are plain `vMAJOR.MINOR.PATCH`. Its config and manifest live in `.github/`, and `CHANGELOG.md` at the root is its output ([30](../docs/decisions/0030-releases-from-release-please.md)).

### Staging Deployments

- Every merge publishes the backend image and the frontend `dist/` by commit SHA to both staging's and prod's stores ([15](../docs/decisions/0015-build-once-promote-by-sha.md)). Both are built on every merge, with a layer cache for the image and an npm cache for the bundle; nothing is reused from an earlier commit ([29](../docs/decisions/0029-build-every-merge.md)). An image whose digest the service already runs isn't redeployed.
- The frontend bundle carries nothing environment-specific; `config.json` is written at deploy time ([15](../docs/decisions/0015-build-once-promote-by-sha.md)).

### Release PR

- `release-please` runs after every merge, checks each direct need for `success` (`services-backend`, a matrix over the images, `services-frontend`, `smoke`), and opens or updates the release PR; a new job a release depends on goes in both its `needs` and its `if:` ([30](../docs/decisions/0030-releases-from-release-please.md)).
- It runs with the `github_provider_token` PAT, because a PR opened with `GITHUB_TOKEN` would not trigger the PR checks ([30](../docs/decisions/0030-releases-from-release-please.md)).
- `plan-prod` posts the prod plan, run with `-lock=false`, on the release PR.

### Production Releases

- Merging the release PR promotes it: `release-please` tags the release and `promote` calls `promote-release.yaml`, which applies prod Terraform, then deploys the backend and the frontend by commit SHA from prod's own stores. Never rebuild for production, and never copy between projects ([15](../docs/decisions/0015-build-once-promote-by-sha.md)).
- The `release-<version>` image tag is for retention only; deploy by SHA ([22](../docs/decisions/0022-artifact-retention.md)).
- Rollback is `promote-release.yaml` run by hand (`workflow_dispatch`) with an earlier release tag; so is finishing a promotion whose deploy failed ([30](../docs/decisions/0030-releases-from-release-please.md)).
- `apply-infrastructure-prod.yaml` is only for backfilling a new per-environment resource a merge depends on; say so in that PR ([17](../docs/decisions/0017-manual-prod-infrastructure-apply.md)).
