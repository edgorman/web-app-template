# 6. A hand-declared moon graph, affected by changed files only

## Context

At about 8 projects, with one Go module and one npm package, inference has nothing to find that a few declared edges don't say more plainly ([5](0005-moon-runs-the-build.md)).

## Decision

- `.moon/workspace.yml` discovers `services/*` and `packages/*` by folder (`globFormat: 'source-path'`, so IDs are paths) and names `root`, `infra-root`, `infra-env` and `deploy-{root,staging,prod}` explicitly. A second binary under `services/backend/cmd/` is named the same way, as its own project with its own `image` task. Each `moon.yml` declares `dependsOn` by hand.
- `root:projects-covered` fails CI if a `services/*` or `packages/*` folder has no `moon.yml`.
- `--affected` is changed files only; nothing uses `--include-relations`. A task that must react to another project lists it in `inputs` (`project://packages/api` on both services' `test`). `.moon/tasks/all.yml`'s `implicitInputs` adds each project's own `moon.yml`, so editing a task runs it.
- `moon ci`'s targets map to the required checks ([8](0008-moon-gates-every-ci-job.md)): `lint-check` runs `:format :lint :vet :typecheck :build :validate root:wire-types root:projects-covered root:go-version-sync root:decision-links root:markdown-lint`, `test` runs `:test services/backend:image`, and `api-drift` runs `packages/api:drift`, each against `origin/main`. A leading `:` runs the task in every project that has it.
- `services/backend:image` is built (not published) on every PR it reaches, so a broken image fails that PR, not the merge job. It has `cache: false` (its output is a Docker layer moon can't restore) and `runInCI: true`.
- Terraform roots are `infra-env`/`infra-root` with `format` and `validate` (`runInCI: 'only'`) from `.moon/tasks/terraform.yml`.

## Consequences

More typing per task than a transitive flag, and exactly as precise as the `inputs` declared.
