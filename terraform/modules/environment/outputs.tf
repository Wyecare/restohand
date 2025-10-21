output "project_id" {
  value       = local.project_id
  description = "Managed project ID"
}

output "project_number" {
  value       = local.project_number
  description = "Project number"
}

output "artifact_registry_repository" {
  value       = google_artifact_registry_repository.containers.id
  description = "Artifact Registry repository resource ID"
}

output "artifact_registry_location" {
  value       = google_artifact_registry_repository.containers.location
  description = "Artifact Registry region"
}

output "assets_bucket" {
  value       = google_storage_bucket.assets.name
  description = "Cloud Storage bucket for assets"
}

output "cloud_run_api_url" {
  value       = google_cloud_run_v2_service.api.uri
  description = "Base URL for the Cloud Run API service"
}

# REMOVED: cloud_run_worker_url - worker functionality integrated into API service

output "cloud_run_api_service_account" {
  value       = google_service_account.api.email
  description = "Service account email used by the API Cloud Run service"
}

# REMOVED: cloud_run_worker_service_account - worker functionality integrated into API service

output "github_deployer_service_account" {
  value       = google_service_account.github.email
  description = "Service account email for GitHub Actions deployments"
}

output "workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full resource name for the GitHub workload identity provider"
}

output "database_instance_connection_name" {
  value       = google_sql_database_instance.postgres.connection_name
  description = "Cloud SQL connection name"
}

output "database_private_ip" {
  value       = google_sql_database_instance.postgres.private_ip_address
  description = "Private IP address of the Cloud SQL instance"
}

output "database_user" {
  value       = google_sql_user.app.name
  description = "Database user provisioned for the application"
}

output "database_password" {
  value       = random_password.database.result
  description = "Password for the application database user"
  sensitive   = true
}

output "redis_host" {
  value       = google_redis_instance.cache.host
  description = "Redis host"
}

output "redis_port" {
  value       = google_redis_instance.cache.port
  description = "Redis port"
}

output "redis_url" {
  value       = local.redis_url
  description = "Redis connection URL"
}

output "firebase_site_id" {
  value       = google_firebase_hosting_site.default.site_id
  description = "Firebase Hosting site ID"
}

output "firebase_web_app_id" {
  value       = google_firebase_web_app.default.app_id
  description = "Firebase web app ID"
}

output "firebase_web_config" {
  value = {
    api_key             = data.google_firebase_web_app_config.default.api_key
    auth_domain         = data.google_firebase_web_app_config.default.auth_domain
    storage_bucket      = data.google_firebase_web_app_config.default.storage_bucket
    messaging_sender_id = data.google_firebase_web_app_config.default.messaging_sender_id
    app_id              = google_firebase_web_app.default.app_id
    measurement_id      = data.google_firebase_web_app_config.default.measurement_id
  }
  description = "Firebase Web App configuration values for frontend integration"
}

output "assets_bucket_url" {
  value       = "gs://${google_storage_bucket.assets.name}"
  description = "gs:// URL for the assets bucket"
}
