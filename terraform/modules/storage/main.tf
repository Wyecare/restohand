terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.25"
    }
  }
}

locals {
  bucket_name = "${var.project_id}-${var.environment}-assets"
  registry_id = "${var.environment}-registry"
}

# Artifact Registry for container images
resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = local.registry_id
  description   = "Container registry for ${var.environment} environment"
  format        = "DOCKER"

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "DELETE"

    condition {
      tag_state    = "TAGGED"
      tag_prefixes = ["latest", var.environment]
      older_than   = "${var.image_retention_days * 24 * 3600}s"
    }
  }

  cleanup_policies {
    id     = "keep-recent-untagged"
    action = "DELETE"

    condition {
      tag_state  = "UNTAGGED"
      older_than = "604800s"  # 7 days in seconds
    }
  }

  labels = var.labels
}

# Cloud Storage bucket for static assets
resource "google_storage_bucket" "assets" {
  project                     = var.project_id
  name                        = local.bucket_name
  location                    = var.storage_location
  uniform_bucket_level_access = true
  force_destroy               = var.environment != "prod"

  versioning {
    enabled = var.enable_versioning
  }

  lifecycle_rule {
    condition {
      age                        = var.asset_retention_days
      with_state                = "LIVE"
      matches_storage_class     = ["STANDARD"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age                        = var.asset_retention_days * 2
      with_state                = "LIVE"
      matches_storage_class     = ["NEARLINE"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  dynamic "lifecycle_rule" {
    for_each = var.environment != "prod" ? [1] : []
    content {
      condition {
        age = 90
      }
      action {
        type = "Delete"
      }
    }
  }

  dynamic "cors" {
    for_each = var.enable_cors ? [1] : []
    content {
      origin          = var.cors_origins
      method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
      response_header = ["*"]
      max_age_seconds = 3600
    }
  }

  labels = var.labels
}

# Backup bucket for database backups
resource "google_storage_bucket" "backups" {
  count                       = var.enable_backup_bucket ? 1 : 0
  project                     = var.project_id
  name                        = "${var.project_id}-${var.environment}-backups"
  location                    = var.storage_location
  uniform_bucket_level_access = true
  force_destroy               = false

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = var.backup_retention_days
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age                   = 7
      with_state           = "LIVE"
      matches_storage_class = ["STANDARD"]
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  labels = merge(var.labels, {
    purpose = "backup"
  })
}

# IAM for storage bucket
resource "google_storage_bucket_iam_member" "assets_object_admin" {
  for_each = toset(var.storage_admins)
  bucket   = google_storage_bucket.assets.name
  role     = "roles/storage.objectAdmin"
  member   = each.value
}

resource "google_storage_bucket_iam_member" "assets_object_viewer" {
  for_each = toset(var.storage_viewers)
  bucket   = google_storage_bucket.assets.name
  role     = "roles/storage.objectViewer"
  member   = each.value
}

# CDN setup for static assets (optional)
resource "google_compute_backend_bucket" "assets_backend" {
  count       = var.enable_cdn ? 1 : 0
  project     = var.project_id
  name        = "${var.environment}-assets-backend"
  bucket_name = google_storage_bucket.assets.name
  enable_cdn  = true
}

resource "google_compute_url_map" "assets_url_map" {
  count           = var.enable_cdn ? 1 : 0
  project         = var.project_id
  name            = "${var.environment}-assets-url-map"
  default_service = google_compute_backend_bucket.assets_backend[0].self_link
}

resource "google_compute_target_https_proxy" "assets_proxy" {
  count   = var.enable_cdn ? 1 : 0
  project = var.project_id
  name    = "${var.environment}-assets-proxy"
  url_map = google_compute_url_map.assets_url_map[0].self_link

  ssl_certificates = var.ssl_certificate_ids
}

resource "google_compute_global_forwarding_rule" "assets_forwarding_rule" {
  count      = var.enable_cdn ? 1 : 0
  project    = var.project_id
  name       = "${var.environment}-assets-forwarding-rule"
  target     = google_compute_target_https_proxy.assets_proxy[0].self_link
  port_range = "443"
}