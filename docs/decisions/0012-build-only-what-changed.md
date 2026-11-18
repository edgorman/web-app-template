# 12. Build only what changed, reuse the rest

## Context

Building both images and the frontend on every merge costs minutes of CI for services the merge never touched, and redeploys backends that did not change.

## Decision

- `services/backend:publish` and `services/frontend:publish` are `noop` markers like the deploy markers ([7](0007-deploy-markers.md)): their `inputs` are the build's inputs plus the actions and workflow that build them. A second binary gets a marker of its own. `push-commit.yaml`'s `changed` job reads them from the same `moon query affected` it runs for Terraform ([8](0008-moon-gates-every-ci-job.md)), against the previous successful run's commit or else the newest `v*` tag, and outputs that commit as `base_sha`.
- An affected image or bundle builds. An unaffected image is `base_sha`'s re-tagged with this commit's SHA in both registries (`backend-deploy`'s `reuse_from`), with no staging deploy, since staging already runs it. An unaffected frontend is `base_sha`'s folder fetched from staging's bucket and published again under this commit, then deployed, so the site always shows the current version. Either falls back to building when `base_sha`'s artifact is missing (a folder past retention).
- So every commit still has every artifact by SHA in both projects, the publish jobs succeed on every merge, and promotion is unchanged ([11](0011-build-once-promote-by-sha.md)).
- `backend-cloudrun-deploy` skips the deploy when the service's latest ready revision already runs the image's digest. On promotion that skips an unchanged backend; a rollback compares digests the same way. The frontend always deploys on promotion, for its version.

## Consequences

A re-tagged image reports the commit it was built from on `/debug`, not the release's. moon only sees files: a change to the `GOOGLE_CLIENT_ID` variable baked into the bundle does not rebuild it. A marker's `inputs` must list every action and workflow its build uses, or an incomplete list under-builds silently.
