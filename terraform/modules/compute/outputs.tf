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

output "service_urls" {
  description = "All service URLs"
  value = {
    api = google_cloud_run_v2_service.api.uri
  }
}

output "service_accounts" {
  description = "All service account emails"
  value = {
    api = google_service_account.api.email
  }
}
