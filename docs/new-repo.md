# Starting a new repository from the template

From **Use this template** to a deployed staging site. Until step 6, the new repository's workflows run only the PR checks; every job that needs GCP or Cloudflare skips itself while the `WORKLOAD_IDENTITY_PROVIDER` repository variable is unset.

You need a GCP billing account, a Cloudflare account, and the toolchain from [`start-here.md`](start-here.md) plus the gcloud CLI. A domain is optional: without one, the frontends are served at their Cloudflare `workers.dev` addresses, and adding a domain later is a tfvars change. Either way, open **Workers & Pages** in the Cloudflare dashboard once, so your account has a `workers.dev` subdomain to serve from.

## 1. Create the repository

Click **Use this template** on GitHub. Then, in the new repository:

- `.github/settings.yml`: set `name` and `description`, and set `is_template` to `false` (or delete the line). The [Settings app](https://github.com/apps/settings) applies this file, and the branch protection in it, once installed on the repository. Branch protection is only available on a public repository or a paid plan: on a private repository on GitHub Free the app cannot apply it, so nothing stops a direct push to `main`.
- `.github/CODEOWNERS`: replace the owner with yours.
- `LICENSE`: your name, or your own licence.
- `README.md`: retitle it with your project's name and replace the template intro (and its **Use this template** line) with what your project does.
- `AGENTS.md` and `docs/start-here.md`: reword the lines pointing at this file, which talk about making a repository from the template; it is now the guide to setting up the cloud side from scratch.

## 2. Name your project

Every name lives in five files; nothing else in the repository needs editing. Pick a short `prefix` (lowercase, hyphens, at most 25 characters): the GCP projects will be `<prefix>-root`, `<prefix>-stag` and `<prefix>-prod`, and project ids are global, so check they're free.

| File | Set |
| --- | --- |
| `infrastructure/config/root/terraform.tfvars` | `gcp_provider_project_id` (`<prefix>-root`), region and zone, `gcp_project_prefix`, `github_repository_owner`/`_name`, `site_name`; with a domain, `cloudflare_zone` and `frontend_hostnames` |
| `infrastructure/config/root/terraform.tfbackend` | `<prefix>-root-terraform-state` |
| `infrastructure/config/staging/terraform.tfvars` | `gcp_project_id` (`<prefix>-stag`), `gcp_region`, `backend_cors_origin` (`https://` + the `stag` hostname, or `https://<prefix>-stag.<account>.workers.dev` without a domain), `alert_notification_emails` (`[]` to email nobody) |
| `infrastructure/config/staging/terraform.tfbackend` | `<prefix>-stag-terraform-state` |
| `infrastructure/config/prod/terraform.tfvars` and `.tfbackend` | the same for `prod` |

Optionally rename the Go module (`go mod edit -module` in `services/backend`, then rewrite the imports); nothing outside the repository imports it, so the template's path works as-is.

## 3. Create the root project and credentials

1. Create the GCP project `<prefix>-root` by hand and link it to your billing account. Everything else is created by Terraform.
2. In that project, create an OAuth 2.0 client ID for Google sign-in (see "Google Sign-In" in `services/frontend/README.md`) and set `google_client_id` in the root `terraform.tfvars`. Its authorized JavaScript origins are `http://localhost:5173` and both site URLs (the `frontend_hostnames`, or the `workers.dev` addresses).
3. Create a GitHub fine-grained personal access token, scoped to the new repository only, with read and write access to:

   | Permission | Access | Used for |
   | --- | --- | --- |
   | **Variables** | Read and write | Terraform writes the repository variables the workflows read |
   | **Contents** | Read and write | release-please tags and publishes releases; Renovate pushes its branches |
   | **Pull requests** | Read and write | release-please and Renovate open and update their PRs |
   | **Workflows** | Read and write | Renovate updates `.github/workflows` and the composite actions |
   | **Issues** | Read and write | Renovate's dependency dashboard and labels |
   | **Commit statuses** | Read and write | Renovate's status checks |

   (Metadata read is added automatically.) One token serves all of them, and it is stored in Secret Manager as `github_provider_token`. A PR opened with the workflow's own token would not trigger the PR checks, which is why release-please and Renovate use this one: their PRs are authored by whoever owns the token. Only the deploy and renovate identities can read it. It holds Contents and Workflows write, so on a repository without branch protection it could push to `main`; keep it scoped to this one repository.

   A fine-grained token expires. To rotate it, create a new one with the same permissions and add it as a new version of the `github_provider_token` secret (`gcloud secrets versions add github_provider_token --data-file=- --project=<prefix>-root`); the workflows read `latest`. Drop Issues and Commit statuses if you remove Renovate's dependency dashboard and status checks.
4. Create a Cloudflare API token with **Account: Workers Scripts: Edit** (plus **Zone: Workers Routes: Edit**, **Zone: DNS: Edit** and **Zone: Zone: Read** on your zone, if you have a domain), and set your Cloudflare account id (not a secret) as `cloudflare_account_id` in the root `terraform.tfvars`.

## 4. Bootstrap the root

The only Terraform you ever run by hand. With `gcloud auth application-default login` done:

```sh
cd infrastructure/root
TF_VAR_github_provider_token=<PAT> TF_VAR_cloudflare_api_token=<TOKEN> make init
```

It creates the environment projects, the state buckets, each environment's artifact registry and frontend bucket, Workload Identity Federation for this repository, the Cloudflare Workers (and, with a domain, their custom domains, which create their own DNS records), stores the two tokens in Secret Manager, and writes the repository variables the workflows read (`WORKLOAD_IDENTITY_PROVIDER`, `PLAN_SERVICE_ACCOUNT`, `DEPLOY_SERVICE_ACCOUNT`, `PROMOTE_SERVICE_ACCOUNT`, `CLOUDFLARE_ACCOUNT_ID`, `GOOGLE_CLIENT_ID`, `GCP_ROOT_PROJECT`, `GCP_PROJECT_PREFIX`, `GCP_REGION`, `SITE_NAME`, `STAGING_URL`, `PRODUCTION_URL`). Then it moves its own state into the bucket it made.

Without a domain, check `terraform output frontend_workers_dev_urls` and use those addresses in `backend_cors_origin` and the OAuth client's origins.

## 5. Open the first pull request

Commit steps 1-3's edits on a branch and open a pull request. Now that the variables exist, it plans root, staging and prod alongside the usual checks. Merge it.

## 6. Staging deploys

The merge applies staging's infrastructure, builds and deploys the backend and frontend, runs the smoke test against `STAGING_URL`, and then release-please opens a release PR (the first `feat:` or `fix:` since the repository began). Merging that PR cuts the first release and deploys it to production (see `.github/AGENTS.md`).

## 7. Make it yours

- Replace or delete the `notes` example (`services/backend/README.md`'s "Adding a resource" lists every place it lives), and the frontend pages built on it.
- Keep the decision records in [`decisions/`](decisions/README.md) that still hold, supersede the ones that don't, and number your own after the last one.
