output "project_id" {
  description = "The project ID"
  value       = module.project.project_id
}

output "project_number" {
  description = "The project number"
  value       = module.project.project_number
}

output "region" {
  description = "The deployment region"
  value       = var.region
}

# Network Outputs
output "vpc_network_name" {
  description = "VPC network name"
  value       = module.networking.network_name
}

output "vpc_connector_name" {
  description = "VPC connector name"
  value       = module.networking.vpc_connector_name
}

# Storage Outputs
output "artifact_registry_url" {
  description = "Artifact Registry URL for pushing images"
  value       = module.storage.artifact_registry_url
}

# output "assets_bucket_name" {
#   description = "Assets storage bucket name"
#   value       = module.storage.assets_bucket_name
# }

output "api_service_url" {
  description = "API service URL"
  value       = module.run_api.api_service_url
}

output "api_service_account_email" {
  description = "API service account email"
  value       = module.run_api.api_service_account_email
}

# Firebase Outputs
output "firebase_config" {
  description = "Firebase web app configuration"
  value       = module.firebase.web_app_config
}

output "firebase_hosting_site_id" {
  description = "Firebase Hosting site ID"
  value       = module.firebase.hosting_site_id
}

output "firebase_project_details" {
  description = "Firebase project configuration details"
  value       = module.firebase.firebase_project_details
}

# IAM Outputs
output "github_service_account_email" {
  description = "GitHub deployment service account email"
  value       = module.iam.github_service_account_email
}

output "workload_identity_provider" {
  description = "Workload Identity Provider for GitHub Actions"
  value       = module.iam.workload_identity_provider_name
}

# Secrets (for GitHub Actions setup)
output "github_secrets_setup" {
  description = "Values needed for GitHub secrets configuration"
  value = {
    project_id                 = module.project.project_id
    workload_identity_provider = module.iam.workload_identity_provider_name
    service_account_email      = module.iam.github_service_account_email
    artifact_registry_url      = module.storage.artifact_registry_url
    api_service_name           = module.run_api.api_service_name
  }
}

# Complete deployment info
output "deployment_summary" {
  description = "Complete deployment summary"
  value = {
    environment   = "prod"
    project_id    = module.project.project_id
    region        = var.region
    api_url       = module.run_api.api_service_url
    firebase_site = module.firebase.hosting_site_id
  }
}