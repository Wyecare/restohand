output "github_service_account_email" {
  description = "Email of the GitHub deployment service account"
  value       = google_service_account.github_deploy.email
}

output "github_service_account_id" {
  description = "ID of the GitHub deployment service account"
  value       = google_service_account.github_deploy.id
}

output "workload_identity_pool_name" {
  description = "Name of the workload identity pool"
  value       = google_iam_workload_identity_pool.github.name
}

output "workload_identity_provider_name" {
  description = "Name of the workload identity provider"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "monitoring_service_account_email" {
  description = "Email of the monitoring service account (if enabled)"
  value       = var.enable_monitoring_sa ? google_service_account.monitoring[0].email : null
}

output "custom_role_ids" {
  description = "IDs of created custom roles"
  value       = { for k, v in google_project_iam_custom_role.custom_roles : k => v.id }
}

output "github_secrets_reference" {
  description = "Reference values for GitHub secrets"
  value = {
    workload_identity_provider = google_iam_workload_identity_pool_provider.github.name
    service_account_email      = google_service_account.github_deploy.email
  }
}