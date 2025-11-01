locals {
  api_service_name    = "${var.environment}-api"
  api_service_account = "${var.environment}-api-sa"

  cloudsql_annotations = var.cloudsql_connection_name != "" ? {
    "run.googleapis.com/cloudsql-instances" = var.cloudsql_connection_name
  } : {}
}

resource "google_service_account" "api" {
  project      = var.project_id
  account_id   = local.api_service_account
  display_name = "Restohand ${var.environment} API"
  description  = "Service account for the Restohand API Cloud Run service"
}

# Minimal IAM grants for the service account
resource "google_project_iam_member" "api_secret_access" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_logging_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "api_monitoring_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_cloud_run_v2_service" "api" {
  provider = google-beta
  project  = var.project_id
  location = var.region
  name     = local.api_service_name
  labels   = var.labels
  deletion_protection = false

  template {
    service_account = google_service_account.api.email
    labels          = var.labels

    scaling {
      min_instance_count = var.api_min_instances
      max_instance_count = var.api_max_instances
    }

    max_instance_request_concurrency = var.api_concurrency

    containers {
      image = var.api_image

      resources {
        cpu_idle          = var.api_cpu_idle
        startup_cpu_boost = var.api_startup_cpu_boost
        limits = {
          cpu    = var.api_cpu_limit
          memory = var.api_memory_limit
        }
      }

      ports {
        container_port = var.api_port
      }

      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }

      env {
        name  = "APP_TIMEZONE"
        value = var.timezone
      }

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

      startup_probe {
        http_get {
          path = var.health_check_path
          port = var.api_port
        }
        initial_delay_seconds = 10
        timeout_seconds       = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = var.health_check_path
          port = var.api_port
        }
        initial_delay_seconds = 30
        timeout_seconds       = 5
        period_seconds        = 30
        failure_threshold     = 3
      }
    }

    annotations = merge(
      local.cloudsql_annotations,
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

    dynamic "vpc_access" {
      for_each = var.vpc_connector_name != "" ? [1] : []
      content {
        connector = var.vpc_connector_name
        egress    = var.vpc_egress
      }
    }
  }

  ingress = var.api_ingress_setting

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image
    ]
  }



  depends_on = [
    google_service_account.api
  ]
}

resource "google_cloud_run_v2_service_iam_member" "api_public_access" {
  count    = var.allow_unauthenticated_api ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
