# 35. The toolchain cache is off in CI

Status: Accepted

## Context

Early CI runs each failed a different moon task with the same `proto-shim: ... Permission denied (os error 13)` error, every time right after a toolchain cache hit. The common thread was the cache restore losing the executable bit on proto's shim, not any task.

## Decision

Every `moonrepo/setup-toolchain` step sets `cache: false`. A cold toolchain install per job costs a minute or two; a cache hit that breaks the job costs a re-run and a doubt about every red check.

## Consequences

Revisit when the cause is confirmed fixed upstream: turn the cache back on and watch for the error. The steward skill treats the error as a toolchain failure, allowing one re-run, not as a test failure.
