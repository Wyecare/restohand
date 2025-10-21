output "api_service_name" {
  description = "Name of the API Cloud Run service"
  value       = google_cloud_run_v2_service.api.name
}

output "api_service_url" {
  description = "URL of the API Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "api_service_account_email" {
  description = "Email of the API service account"
  value       = google_service_account.api.email
}

output "worker_service_name" {
  description = "Name of the worker Cloud Run service (if enabled)"
  value       = var.enable_separate_worker ? google_cloud_run_v2_service.worker[0].name : null
}

output "worker_service_url" {
  description = "URL of the worker Cloud Run service (if enabled)"
  value       = var.enable_separate_worker ? google_cloud_run_v2_service.worker[0].uri : null
}

output "worker_service_account_email" {
  description = "Email of the worker service account (if enabled)"
  value       = var.enable_separate_worker ? google_service_account.worker[0].email : null
}

output "scheduler_job_names" {
  description = "Names of created Cloud Scheduler jobs"
  value       = [for job in google_cloud_scheduler_job.worker_jobs : job.name]
}

output "service_urls" {
  description = "All service URLs"
  value = {
    api    = google_cloud_run_v2_service.api.uri
    worker = var.enable_separate_worker ? google_cloud_run_v2_service.worker[0].uri : null
  }
}

output "service_accounts" {
  description = "All service account emails"
  value = {
    api    = google_service_account.api.email
    worker = var.enable_separate_worker ? google_service_account.worker[0].email : null
  }
}