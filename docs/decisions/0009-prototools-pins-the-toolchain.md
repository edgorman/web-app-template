# 9. `.prototools` is the single source of tool versions

## Context

A tool version repeated in a setup step, a Dockerfile and a local install drifts.

## Decision

The root `.prototools` pins `moon`, `go`, `node`, `npm` and `terraform`, read by [proto](https://moonrepo.dev/proto) in CI (`moonrepo/setup-toolchain`, through the `setup-moon` action) and locally (`proto install`). The `frontend-node` action and the Terraform actions read the pin rather than repeating it. `root:go-version-sync` fails CI if the `go` pin and `services/backend/go.mod` disagree; the Dockerfile's `golang` image moves with them. Renovate keeps the pins current ([19](0019-self-hosted-renovate.md)).

## Consequences

A version bump is one line, plus `go.mod` and the Dockerfile for Go.
