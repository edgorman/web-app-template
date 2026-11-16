output "environment_project_ids" {
  description = "GCP project ids for root and each environment"
  value       = { for k, v in local.all_projects : k => v.project_id }
}

output "terraform_state_buckets" {
  description = "GCS bucket names holding Terraform state for root and each environment"
  value       = { for k, v in google_storage_bucket.gcp_project_terraform_states : k => v.name }
}

output "workload_identity_provider" {
  description = "Full resource name of the WIF provider (also written to the WORKLOAD_IDENTITY_PROVIDER Actions variable)"
  value       = google_iam_workload_identity_pool_provider.github_provider.name
}

output "github_service_accounts" {
  description = "Emails of the GitHub Actions identities: plan (read-only), deploy (main, push-commit.yaml) and promote (main, prod). Also written to the *_SERVICE_ACCOUNT Actions variables."
  value = {
    plan    = google_service_account.github_plan.email
    deploy  = google_service_account.github_deploy.email
    promote = google_service_account.github_promote.email
  }
}

output "frontend_workers_dev_urls" {
  description = "workers.dev address of each environment's Cloudflare Worker"
  value       = { for k, v in cloudflare_worker.frontend : k => v.subdomain.url }
}

output "frontend_domains" {
  description = "Custom domain bound to each environment's Cloudflare Worker, if any"
  value       = { for k, v in cloudflare_workers_custom_domain.frontend : k => v.hostname }
}

output "artifact_registry_repositories" {
  description = "Full resource name of each environment's backend Artifact Registry repository"
  value       = { for k, v in google_artifact_registry_repository.backend : k => v.name }
}

output "frontend_buckets" {
  description = "Name of each environment's frontend static-build bucket"
  value       = { for k, v in google_storage_bucket.frontend : k => v.name }
}
