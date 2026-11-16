# 29. Build every merge

Status: Accepted (supersedes [26](0026-build-only-what-changed.md); [15](0015-build-once-promote-by-sha.md) holds again)

## Context

[26](0026-build-only-what-changed.md) rebuilt only what a merge touched and reused the last release's artifact for the rest, to save about a minute of cached Go and Vite build. The price was a second path through every publish job: `publish` marker tasks whose `inputs` had to list every action and workflow a build used (an incomplete list under-builds silently), a `base_sha` resolved from the newest release tag, re-tagging with a fallback to building, and a re-publish of the frontend folder with its own fallback.

## Decision

- Every merge to `main` builds the backend image and the frontend bundle and publishes both by commit SHA to staging's and prod's stores, as [15](0015-build-once-promote-by-sha.md) said. The `publish` markers, `base_sha` and the reuse steps are gone.
- Caching makes an unchanged service a fast rebuild instead: the image build uses the GitHub Actions layer cache (`docker/build-push-action`, scoped per image), and `frontend-build` caches npm.
- `backend-cloudrun-deploy` still skips the deploy when the service already runs the image's digest.
- Production promotion is unchanged: it deploys the commit-SHA artifact already in prod's own stores and never rebuilds ([15](0015-build-once-promote-by-sha.md)).

## Consequences

Every merge adds an image version, so the registry's keep-newest window ([22](0022-artifact-retention.md)) counts merges again. A change to a file no build reads, or to the `GOOGLE_CLIENT_ID` variable baked into the bundle, no longer needs reasoning about: the bundle is rebuilt anyway.
