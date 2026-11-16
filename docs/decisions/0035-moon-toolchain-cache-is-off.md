# 35. The toolchain cache is off in CI

Status: Accepted

## Context

Early CI runs each failed a different moon task with the same `proto-shim: ... Permission denied (os error 13)` error, every time right after a toolchain cache hit. The common thread was the cache restore losing the executable bit on proto's shim, not any task.

## Decision

Every `moonrepo/setup-toolchain` step sets `cache: false`. A cold toolchain install per job costs a minute or two; a cache hit that breaks the job costs a re-run and a doubt about every red check.

## Setup before tasks

The same error also appears without a cache: moon installs proto (`SetupProto`) as part of its own action pipeline, while the first task that has no dependencies, often a `terraform validate`, is already calling a shimmed tool, and a shim that runs while proto is being installed fails with the same `Permission denied`. A job whose first task is slow to reach its shimmed command (a provider-heavy `terraform init`) hides it; a fast one exposes it. Jobs that run `moon ci` therefore set `auto-setup: true` on `setup-toolchain`, which runs `moon setup` first, so proto and every tool are installed before any task starts.

## Consequences

Revisit when the cause is confirmed fixed upstream: turn the cache back on and watch for the error. The steward skill treats the error as a toolchain failure, allowing one re-run, not as a test failure.
