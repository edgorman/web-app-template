# Decision records

One file per decision: its context, the decision, and its consequences. The rules that follow from them are in the `AGENTS.md` files, each linking here.

These records hold for any repository made from this template. Edit one in place when its decision changes, and number your own from the next free number.

| # | Decision | Area |
| --- | --- | --- |
| [1](0001-manifests-live-with-their-code.md) | Manifests live with their code | repo |
| [2](0002-openapi-is-the-api-contract.md) | OpenAPI is the API contract | api |
| [3](0003-one-access-policy-table.md) | One access policy table, closed by default | backend |
| [4](0004-debug-endpoint-contract.md) | The debug endpoint contract | backend |
| [5](0005-moon-runs-the-build.md) | moon runs the build and CI | ci |
| [6](0006-hand-declared-moon-graph.md) | A hand-declared moon graph, affected by changed files only | ci |
| [7](0007-deploy-markers.md) | Deploy decisions come from marker tasks | ci |
| [8](0008-moon-gates-every-ci-job.md) | moon decides which CI jobs run | ci |
| [9](0009-prototools-pins-the-toolchain.md) | `.prototools` is the single source of tool versions | ci |
| [10](0010-toolchain-cache-is-off.md) | The toolchain cache is off in CI | ci |
| [11](0011-build-once-promote-by-sha.md) | Build once, promote by commit SHA | ci |
| [12](0012-build-only-what-changed.md) | Build only what changed, reuse the rest | ci |
| [13](0013-releases-from-release-please.md) | Releases come from release-please | ci |
| [14](0014-release-commits-have-their-own-workflow.md) | Release commits have their own workflow | ci |
| [15](0015-manual-prod-infrastructure-apply.md) | A manual prod apply, for backfilling only | ci |
| [16](0016-replan-at-apply.md) | Applies re-plan instead of applying a saved plan | ci |
| [17](0017-advisory-security-scanning.md) | Security scanning is advisory | ci |
| [18](0018-skip-secrets-scan-on-docs-lint-markdown.md) | The secrets scan skips docs, and Markdown is linted | ci |
| [19](0019-self-hosted-renovate.md) | Dependency updates come from self-hosted Renovate | ci |
| [20](0020-one-gcp-project-per-environment.md) | One GCP project per environment, plus a root | infrastructure |
| [21](0021-plan-and-apply-identities.md) | Plan and apply authenticate as separate identities | infrastructure |
| [22](0022-artifact-stores-are-created-by-root.md) | Artifact stores are created by root, one set per environment | infrastructure |
| [23](0023-artifact-retention.md) | Artifact retention keeps recent merges and every release | infrastructure |
| [24](0024-monitoring-on-cloud-run-metrics.md) | Monitoring watches Cloud Run's own metrics | infrastructure |
