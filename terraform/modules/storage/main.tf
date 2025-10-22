

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