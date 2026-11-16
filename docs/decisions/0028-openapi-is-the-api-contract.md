# 28. OpenAPI is the API contract

Status: Accepted

## Context

The API is plain REST/JSON between one Go service and one TypeScript client. The `.proto` files ([2](0002-generated-code-is-committed.md) to [9](0009-wire-changes-across-releases.md)) described only message shapes: routes, methods, paths and the client were hand-written on both sides, and `protojson` was there to serialize messages that existed only to be serialized. Nothing checked that the frontend called a route the backend served.

## Decision

`packages/api/openapi.yaml` is the one contract, and both services generate from it.

- **Backend.** `oapi-codegen`, pinned as a `go tool` in `services/backend/go.mod`, writes `internal/api`: the models, a `net/http` `ServerInterface` registered on the `ServeMux`, and the spec embedded in the binary. A route exists exactly when the spec declares it and `service.Service` implements the operation; the compiler checks the second half.
- **Frontend.** `openapi-typescript` writes `src/gen/schema.d.ts`, and `openapi-fetch` makes typed calls. A path or method the spec does not declare fails `tsc`. `openapi-typescript` needs the TypeScript 5 compiler API, so its pin lives in `packages/api/package.json` rather than in the frontend, which runs TypeScript 7.
- **Required properties.** A property the server always sends is `required`, which gives a non-pointer Go field without `omitempty` and a required TypeScript field. One that is not required is one where "absent" and "empty" differ (`PUT /users/me`'s `username`), and is a pointer in Go.
- **Authentication** is declared per operation in `security` and read from the embedded spec when the service starts: no `security` means no credential is looked at, `security` with an empty requirement (`{}`) means a credential is verified if sent, and `security` alone means a verified caller is required and metered per account. A route cannot be added without saying which it is.
- **Visibility** is an `enum` in the spec, so Go has typed constants and TypeScript a union. The entity still validates it.
- **Bodies** are plain `encoding/json`. A field a type does not declare is ignored, which is what makes an additive change safe to deploy before the client that sends it.
- **Generated code is committed**, next to its consumer, and nobody edits it by hand. `api-drift` (`packages/api:drift`) re-runs both generators and fails on `git status --porcelain` over `packages/api` and both generated outputs. Every generator is pinned exactly: `oapi-codegen` in `go.mod`, `openapi-typescript` and `openapi-fetch` without `^`.
- **No hand-written wire types.** `root:wire-types` fails on an `export interface` in `api.ts` and on any `json:"..."` tag in `internal/service`'s non-test files. What stays hand-written is authorization (`entity/access.go`), `Validate()`/`Set*`, third-party shapes, and `config.ts`'s `RuntimeConfig` ([15](0015-build-once-promote-by-sha.md)).
- **Wire changes are additive.** A production release deploys the backend before the frontend ([15](0015-build-once-promote-by-sha.md)), so for a short window a new backend serves the previous bundle. `oasdiff` runs against `origin/main`'s spec as the required `api-breaking` check (`packages/api:breaking`, in `conventions.yaml`). A deliberate break is marked breaking (`!` in the PR title or a `BREAKING CHANGE:` footer), which skips the check and bumps the major version.
- **Validity.** `TestSpec_IsValid` loads the embedded spec and validates it as OpenAPI 3, which is the spec's linter.

## Consequences

- A new resource starts as paths and schemas in `openapi.yaml`, then `moon run packages/api:generate`.
- `buf`, `protoc-gen-go`, `ts-proto` and the protobuf runtime are gone.
- Timestamps are `encoding/json` RFC 3339: fractional seconds lose trailing zeros, where `protojson` padded them to 3, 6 or 9 digits. Clients parse both, and the `startAfter` cursor round-trips.
- An empty `limit=` is a `400`; it used to be read as absent.
- Supersedes 2, 3, 4, 5, 6, 7, 8 and 9. What they decided about committing generated code, pinning generators, the single error envelope, no hand-written wire types and additive changes is restated above for the new tools.
