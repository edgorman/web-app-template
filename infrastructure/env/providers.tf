# Applied once per environment (staging/prod), against a state bucket infrastructure/root already
# created - so unlike that root, this one needs no local-state bootstrap.
terraform {
  required_version = "1.15.8"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "8.10.0"
    }
  }

  backend "gcs" {
    bucket = ""
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# CI's service account lives in the root project, so GCP bills Firestore Admin API quota to root
# rather than the project whose API is actually enabled; user_project_override redirects it (and
# needs serviceusage.services.use, granted in infrastructure/root/github_cicd.tf). Kept on an alias
# so enabling the APIs themselves doesn't depend on a project whose APIs aren't enabled yet.
provider "google" {
  alias                 = "quota"
  project               = var.gcp_project_id
  region                = var.gcp_region
  user_project_override = true
}
