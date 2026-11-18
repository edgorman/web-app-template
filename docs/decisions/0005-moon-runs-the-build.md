# 5. moon runs the build and CI

## Context

A monorepo with one Go module, one npm package and Terraform roots needs one place that says which tasks exist, what each depends on and which ones a diff reaches. It must work unsandboxed on a developer's machine, in GitHub Actions and in a Claude Code cloud session.

## Decision

Use moon v2: a per-project graph of hand-declared edges plus per-task `inputs` ([6](0006-hand-declared-moon-graph.md)), with tool versions pinned in `.prototools` ([9](0009-prototools-pins-the-toolchain.md)).

Deliberately given up:

- Per-file dependency inference. With one Go module, one npm package and no cross-project imports, there is nothing for it to find.
- A sandbox. moon runs in the real checkout, so undeclared inputs aren't caught; `inputs` must be explicit where it matters, and `terraform init` sees the runner's `PATH`.
- A remote cache. moon's remote cache speaks only Bazel Remote Execution v2; `moon ci` skipping unaffected work covers most of it. Add one (e.g. `bazel-remote` on GCS) only if CI time becomes a problem.

## Consequences

The frontend bundle builds as `services/frontend:build`, and the backend image as `services/backend:image`. moon installs with proto, so a Claude Code cloud session needs only the pinned toolchain `.claude/hooks/session-start.sh` installs.
