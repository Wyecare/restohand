locals {
  project_id     = var.project_id
  project_name   = coalesce(var.project_name, var.project_id)
  project_labels = merge(var.labels, { environment = var.environment })
  location       = coalesce(var.location, var.region)
}

resource "google_project" "this" {
  count           = var.create_project ? 1 : 0
  project_id      = local.project_id
  name            = local.project_name
  labels          = local.project_labels
  billing_account = var.billing_account_id

  org_id    = var.parent_folder_id == null ? var.org_id : null
  folder_id = var.parent_folder_id
}

data "google_project" "this" {
  project_id = local.project_id
  depends_on = [google_project.this]
}

locals {
  project_number = data.google_project.this.number
}


# Enable core APIs required by the stack
locals {
  required_services = [
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "sqladmin.googleapis.com",
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
    "servicenetworking.googleapis.com"
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.required_services)
  project            = local.project_id
  service            = each.value
  disable_on_destroy = false
  depends_on         = [google_project.this]
}

# Artifact Registry repository for container images
resource "google_artifact_registry_repository" "containers" {
  project       = local.project_id
  location      = var.region
  repository_id = var.artifact_registry_repository
  description   = var.artifact_registry_description
  format        = "DOCKER"
  labels        = local.project_labels

  depends_on = [google_project_service.enabled]
}

# Storage bucket for file uploads / assets
resource "google_storage_bucket" "assets" {
  project                     = local.project_id
  name                        = "${local.project_id}-assets"
  location                    = local.location
  uniform_bucket_level_access = true
  labels                      = local.project_labels
  force_destroy               = true

  depends_on = [google_project_service.enabled]
}

# Network for serverless connector and Memorystore
resource "google_compute_network" "serverless" {
  project                 = local.project_id
  name                    = "${var.environment}-serverless"
  auto_create_subnetworks = false
  description             = "VPC network for serverless resources"
  routing_mode            = "REGIONAL"

  depends_on = [google_project_service.enabled]
}

resource "google_compute_subnetwork" "serverless" {
  project       = local.project_id
  name          = "${var.environment}-serverless-subnet"
  ip_cidr_range = "10.8.0.0/28"
  region        = var.region
  network       = google_compute_network.serverless.id
  purpose       = "PRIVATE"
  stack_type    = "IPV4_ONLY"

  depends_on = [google_compute_network.serverless]
}


resource "google_vpc_access_connector" "serverless" {
  name    = var.vpc_connector_name != null ? var.vpc_connector_name : "${var.environment}-connector"
  region  = var.region
  project = local.project_id
  subnet {
    name       = google_compute_subnetwork.serverless.name
    project_id = local.project_id
  }
  min_instances = 2
  max_instances = 3

  depends_on = [google_compute_subnetwork.serverless, google_project_service.enabled]
}



# Memorystore Redis instance
resource "google_redis_instance" "cache" {
  project                 = local.project_id
  name                    = var.redis_instance_name
  tier                    = "BASIC"
  memory_size_gb          = var.redis_memory_size_gb
  region                  = var.region
  transit_encryption_mode = "DISABLED"
  authorized_network      = google_compute_network.serverless.id
  labels                  = local.project_labels

  depends_on = [google_project_service.enabled]
}

# Cloud SQL (Postgres)
resource "random_password" "database" {
  length  = 24
  special = false
}

resource "google_compute_global_address" "sql_range" {
  name          = "${var.environment}-sql-range"
  project       = local.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.serverless.id
  depends_on    = [google_project_service.enabled]
}

resource "google_service_networking_connection" "cloudsql" {
  network                 = google_compute_network.serverless.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.sql_range.name]
  depends_on              = [google_compute_global_address.sql_range, google_compute_subnetwork.serverless]
}

resource "google_sql_database_instance" "postgres" {
  project          = local.project_id
  name             = var.database_instance_name
  region           = var.region
  database_version = var.database_version

  settings {
    tier                        = var.database_tier
    availability_type           = "ZONAL"
    disk_autoresize             = true
    deletion_protection_enabled = false

    ip_configuration {
      private_network = google_compute_network.serverless.id
      ipv4_enabled = true
    }
  }

  depends_on = [google_service_networking_connection.cloudsql]
}

resource "google_sql_database" "app" {
  project  = local.project_id
  instance = google_sql_database_instance.postgres.name
  name     = var.database_name
}

resource "google_sql_user" "app" {
  project  = local.project_id
  instance = google_sql_database_instance.postgres.name
  name     = var.database_user
  password = random_password.database.result
}

# Secrets
resource "google_secret_manager_secret" "jwt" {
  project   = local.project_id
  secret_id = "jwt-secret"
  replication {
    auto {}
  }
  labels = local.project_labels
}

resource "random_password" "jwt" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret_version" "jwt" {
  secret      = google_secret_manager_secret.jwt.id
  secret_data = random_password.jwt.result
}

resource "google_secret_manager_secret" "database_url" {
  project   = local.project_id
  secret_id = "database-url"
  replication {
    auto {}
  }
  labels = local.project_labels
}

locals {
  database_url = "postgresql://${var.database_user}:${random_password.database.result}@localhost/${var.database_name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = local.database_url
}

resource "google_secret_manager_secret" "redis_url" {
  project   = local.project_id
  secret_id = "redis-url"
  replication {
    auto {}
  }
  labels = local.project_labels
}

locals {
  redis_url = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = local.redis_url
}

resource "google_secret_manager_secret" "mail_from" {
  project   = local.project_id
  secret_id = "mail-from"
  replication {
    auto {}
  }
  labels = local.project_labels
}

resource "google_secret_manager_secret_version" "mail_from" {
  secret      = google_secret_manager_secret.mail_from.id
  secret_data = var.mail_from
}

resource "google_secret_manager_secret" "frontend_url" {
  count     = var.frontend_url == null ? 0 : 1
  project   = local.project_id
  secret_id = "frontend-url"
  replication {
    auto {}
  }
  labels = local.project_labels
}

resource "google_secret_manager_secret_version" "frontend_url" {
  count       = var.frontend_url == null ? 0 : 1
  secret      = google_secret_manager_secret.frontend_url[0].id
  secret_data = var.frontend_url
}

# Additional secrets map
resource "google_secret_manager_secret" "additional" {
  for_each  = var.additional_secrets
  project   = local.project_id
  secret_id = each.key
  replication {
    auto {}
  }
  labels = local.project_labels
}

resource "google_secret_manager_secret_version" "additional" {
  for_each    = { for k, v in var.additional_secrets : k => v if length(v) > 0 }
  secret      = google_secret_manager_secret.additional[each.key].id
  secret_data = each.value
}

# Service accounts
resource "google_service_account" "api" {
  project      = local.project_id
  account_id   = "${var.environment}-api"
  display_name = "Restohand API runtime (includes background workers)"
}

# REMOVED: worker service account - functionality integrated into API service

resource "google_service_account" "github" {
  project      = local.project_id
  account_id   = "${var.environment}-github"
  display_name = "GitHub Actions deployer"
}

# IAM bindings for runtime service account (API only - includes worker functionality)
resource "google_project_iam_member" "runtime_secret_access" {
  project = local.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "runtime_sql" {
  project = local.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api.email}"
}

resource "google_project_iam_member" "runtime_redis" {
  project = local.project_id
  role    = "roles/redis.viewer"
  member  = "serviceAccount:${google_service_account.api.email}"
}


# Workload Identity configuration for GitHub Actions
resource "google_iam_workload_identity_pool" "github" {
  project                   = local.project_id
  workload_identity_pool_id = var.workload_identity_pool_id
  display_name              = "GitHub Actions"
  description               = "Federation pool for GitHub Actions deployments"
  disabled                  = false
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = local.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = var.workload_identity_provider_id
  display_name                       = "GitHub"
  description                        = "GitHub OIDC provider"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }
  attribute_condition = "attribute.repository==\"${var.github_repository}\""
}

resource "google_service_account_iam_member" "github_workload_user" {
  service_account_id = google_service_account.github.id
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

resource "google_project_iam_member" "github_deploy_permissions_editor" {
  project = local.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.github.email}"
}

resource "google_project_iam_member" "github_deploy_permissions_artifact_registry" {
  project = local.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github.email}"
}

# Firebase resources
resource "google_firebase_project" "default" {
  provider   = google-beta
  project    = local.project_id
  depends_on = [google_project_service.enabled]
}

resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = local.project_id
  display_name = var.firebase_web_app_display_name
  depends_on   = [google_firebase_project.default]
}

data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  project    = local.project_id
  web_app_id = google_firebase_web_app.default.app_id
  depends_on = [google_firebase_web_app.default]
}

resource "google_firebase_hosting_site" "default" {
  provider   = google-beta
  site_id    = var.firebase_site_id
  depends_on = [google_firebase_project.default]
}

resource "google_firebase_hosting_channel" "preview" {
  provider   = google-beta
  site_id    = google_firebase_hosting_site.default.site_id
  channel_id = "preview"
  ttl        = "2592000s" # 30 days
}

# Cloud Run API service (includes background worker functionality)
resource "google_cloud_run_v2_service" "api" {
  provider = google-beta
  project  = local.project_id
  location = var.region
  name     = var.api_service_name

  template {
    service_account = google_service_account.api.email
    scaling {
      min_instance_count = var.min_instances_api
      max_instance_count = var.max_instances_api
    }
    containers {
      image = var.api_image
      resources {
        cpu_idle = true
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }
      ports {
        container_port = 3000
      }
      env {
        name  = "NODE_ENV"
        value = var.environment == "prod" ? "production" : "development"
      }
      env {
        name  = "ENABLE_BACKGROUND_WORKERS"
        value = "true"
      }
      env {
        name  = "FIREBASE_SERVICE_ACCOUNT_PATH"
        value = "./config/firebase-service-account.json"
      }
      env {
        name  = "APP_TIMEZONE"
        value = var.timezone
      }

      env {
        name = "FIREBASE_SERVICE_ACCOUNT_JSON"
        value_source {
          secret_key_ref {
            secret  = "firebase-service-account"
            version = "latest"
          }
        }
      }



      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.database_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.jwt.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "REDIS_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_url.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "MAIL_FROM"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.mail_from.secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "EMAIL_USER"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.additional["smtp-user"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "EMAIL_PASS"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.additional["smtp-pass"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FRONTEND_URL"
        value_source {
          secret_key_ref {
            secret  = "frontend-url"
            version = "latest"
          }
        }
      }
      env {
        name = "FIREBASE_ADMIN_PROJECT_ID"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.additional["firebase-admin-project-id"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FIREBASE_ADMIN_CLIENT_EMAIL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.additional["firebase-admin-client-email"].secret_id
            version = "latest"
          }
        }
      }
      env {
        name = "FIREBASE_ADMIN_PRIVATE_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.additional["firebase-admin-private-key"].secret_id
            version = "latest"
          }
        }
      }

    }

    annotations = {
      "run.googleapis.com/cloudsql-instances" = google_sql_database_instance.postgres.connection_name
    }

    vpc_access {
      connector = google_vpc_access_connector.serverless.id
    }
  }

  ingress    = var.ingress_settings
  depends_on = [google_project_service.enabled, google_sql_database_instance.postgres, google_secret_manager_secret_version.database_url]
}

# REMOVED: Worker Cloud Run service - functionality integrated into API service
# Background worker capabilities are now handled by the API service with ENABLE_BACKGROUND_WORKERS=true

# Allow unauthenticated access to API if requested
resource "google_cloud_run_v2_service_iam_member" "api_invoker" {
  provider = google-beta
  count    = var.allow_unauthenticated ? 1 : 0
  project  = local.project_id
  location = var.region
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Cloud Scheduler jobs
resource "google_cloud_scheduler_job" "http" {
  for_each    = { for job in var.scheduler_jobs : job.name => job }
  project     = local.project_id
  region      = var.region
  name        = each.key
  description = lookup(each.value, "description", null)
  schedule    = each.value.schedule
  time_zone   = var.timezone

  http_target {
    http_method = lookup(each.value, "http_method", "POST")
    uri         = each.value.uri

    oidc_token {
      service_account_email = google_service_account.api.email
      audience              = each.value.uri
    }
  }

  depends_on = [google_cloud_run_v2_service.api]
}
