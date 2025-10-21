terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.25"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.25"
    }
  }
}

locals {
  api_service_name      = "${var.environment}-api"
  worker_service_name   = "${var.environment}-worker"
  api_service_account   = "${var.environment}-api-sa"
  worker_service_account = "${var.environment}-worker-sa"
}

# Service Accounts
resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = local.api_service_account
  display_name = "API Service Account for ${var.environment}"
  description  = "Service account for Wyecare API service"
}

resource "google_service_account" "worker" {
  count        = var.enable_separate_worker ? 1 : 0
  project      = var.project_id
  account_id   = local.worker_service_account
  display_name = "Worker Service Account for ${var.environment}"
  description  = "Service account for Wyecare background worker service"
}

# IAM roles for API service account
resource "google_project_iam_member" "api_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_redis_viewer" {
  project = var.project_id
  role    = "roles/redis.viewer"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage_object_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_service_account_token_creator" {
  project = var.project_id
  role    = "roles/iam.serviceAccountTokenCreator"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_trace_agent" {
  project = var.project_id
  role    = "roles/cloudtrace.agent"
  member  = "serviceAccount:${google_service_account.api.email}"
}

# IAM roles for Worker service account (if separate worker enabled)
resource "google_project_iam_member" "worker_secret_access" {
  count   = var.enable_separate_worker ? 1 : 0
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.worker[0].email}"
}

resource "google_project_iam_member" "worker_sql_client" {
  count   = var.enable_separate_worker ? 1 : 0
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.worker[0].email}"
}

resource "google_project_iam_member" "worker_redis_viewer" {
  count   = var.enable_separate_worker ? 1 : 0
  project = var.project_id
  role    = "roles/redis.viewer"
  member  = "serviceAccount:${google_service_account.worker[0].email}"
}

# Cloud Run API Service
resource "google_cloud_run_v2_service" "api" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = local.api_service_name

  template {
    service_account = google_service_account.api.email

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    containers {
      image = var.api_image

      resources {
        cpu_idle = var.api_cpu_idle
        startup_cpu_boost = var.api_startup_cpu_boost
        limits = {
          cpu    = var.api_cpu_limit
          memory = var.api_memory_limit
        }
      }

      ports {
        container_port = var.api_port
      }

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      env {
        name  = "ENABLE_BACKGROUND_WORKERS"
        value = var.enable_separate_worker ? "false" : "true"
      }

      env {
        name  = "APP_TIMEZONE"
        value = var.timezone
      }

      # PORT is automatically set by Cloud Run, removed manual setting

      # Secret environment variables
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      # Additional environment variables
      dynamic "env" {
        for_each = var.additional_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "volume_mounts" {
        for_each = var.cloudsql_connection_name != "" ? [1] : []
        content {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      # Startup probe
      startup_probe {
        http_get {
          path = var.health_check_path
          port = var.api_port
        }
        initial_delay_seconds = 10
        timeout_seconds      = 5
        period_seconds       = 10
        failure_threshold    = 3
      }

      # Liveness probe
      liveness_probe {
        http_get {
          path = var.health_check_path
          port = var.api_port
        }
        initial_delay_seconds = 30
        timeout_seconds      = 5
        period_seconds       = 30
        failure_threshold    = 3
      }
    }

    # Annotations
    annotations = merge(
      {
        "run.googleapis.com/cloudsql-instances" = var.cloudsql_connection_name
      },
      var.additional_annotations
    )

    dynamic "volumes" {
      for_each = var.cloudsql_connection_name != "" ? [1] : []
      content {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [var.cloudsql_connection_name]
        }
      }
    }

    # VPC access
    vpc_access {
      connector = var.vpc_connector_name
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }

  ingress = var.api_ingress_setting

  depends_on = [
    google_service_account.api
  ]
}

# Cloud Run Worker Service (optional separate worker)
resource "google_cloud_run_v2_service" "worker" {
  count    = var.enable_separate_worker ? 1 : 0
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = local.worker_service_name

  template {
    service_account = google_service_account.worker[0].email

    scaling {
      min_instance_count = var.worker_min_instances
      max_instance_count = var.worker_max_instances
    }

    containers {
      image = var.worker_image != null ? var.worker_image : var.api_image

      resources {
        cpu_idle = false  # Workers should keep CPU allocated
        limits = {
          cpu    = var.worker_cpu_limit
          memory = var.worker_memory_limit
        }
      }

      # Worker-specific environment variables
      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      env {
        name  = "ENABLE_BACKGROUND_WORKERS"
        value = "true"
      }

      env {
        name  = "WORKER_TYPE"
        value = var.worker_type
      }

      env {
        name  = "APP_TIMEZONE"
        value = var.timezone
      }

      # Secret environment variables (same as API)
      dynamic "env" {
        for_each = var.secret_env_vars
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = env.value.secret_name
              version = env.value.version
            }
          }
        }
      }

      # Worker-specific environment variables
      dynamic "env" {
        for_each = var.worker_env_vars
        content {
          name  = env.key
          value = env.value
        }
      }

      # Health check (workers might not have HTTP endpoints)
      dynamic "startup_probe" {
        for_each = var.worker_health_check_path != null ? [1] : []
        content {
          http_get {
            path = var.worker_health_check_path
            port = var.api_port
          }
          initial_delay_seconds = 30
          timeout_seconds      = 10
          period_seconds       = 30
          failure_threshold    = 5
        }
      }
    }

    annotations = merge(
      {
        "run.googleapis.com/cloudsql-instances" = var.cloudsql_connection_name
      },
      var.additional_annotations
    )

    vpc_access {
      connector = var.vpc_connector_name
      egress    = "PRIVATE_RANGES_ONLY"
    }
  }

  # Workers don't need external access
  ingress = "INGRESS_TRAFFIC_INTERNAL_ONLY"

  depends_on = [
    google_service_account.worker
  ]
}

# Cloud Run IAM for public access (API only)
resource "google_cloud_run_v2_service_iam_member" "api_public_access" {
  count    = var.allow_unauthenticated_api ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Scheduler jobs for triggering workers
resource "google_cloud_scheduler_job" "worker_jobs" {
  for_each    = var.scheduler_jobs
  project     = var.project_id
  region      = var.region
  name        = "${var.environment}-${each.key}"
  description = each.value.description
  schedule    = each.value.schedule
  time_zone   = var.timezone

  http_target {
    http_method = "POST"
    uri         = "${var.enable_separate_worker ? google_cloud_run_v2_service.worker[0].uri : google_cloud_run_v2_service.api.uri}${each.value.path}"

    headers = {
      "Content-Type" = "application/json"
    }

    body = base64encode(jsonencode(each.value.payload))

    oidc_token {
      service_account_email = var.enable_separate_worker ? google_service_account.worker[0].email : google_service_account.api.email
      audience              = var.enable_separate_worker ? google_cloud_run_v2_service.worker[0].uri : google_cloud_run_v2_service.api.uri
    }
  }

  retry_config {
    retry_count = each.value.retry_count
  }
}
