terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = "6.8.0"
    }
  }
}


locals {
  project_labels = merge(var.labels, {
    environment = var.environment
    managed_by  = "terraform"
    application = "restohand"
  })
}

resource "google_project" "project" {
    count           = var.create_project ? 1 : 0
    name            = var.project_name
    project_id      = var.project_id
    org_id          = var.org_id
    billing_account = var.billing_account_id
    labels          = local.project_labels
}


# Get project data (whether created or existing)
data "google_project" "this" {
  project_id = var.project_id
  depends_on = [google_project.project]
}

# Enable required APIs
resource "google_project_service" "enabled" {
  for_each = toset([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "compute.googleapis.com",
    "redis.googleapis.com",
    "vpcaccess.googleapis.com",
    "cloudscheduler.googleapis.com",
    "firebase.googleapis.com",
    "firebaserules.googleapis.com",
    "appengine.googleapis.com",
    "storage.googleapis.com",
    "servicenetworking.googleapis.com",
    "monitoring.googleapis.com",
    "logging.googleapis.com",
    "cloudtrace.googleapis.com"
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false

  depends_on = [google_project.project]
}

# Wait for APIs to be enabled
resource "time_sleep" "api_enabling" {
  create_duration = "60s"
  depends_on      = [google_project_service.enabled]
}
