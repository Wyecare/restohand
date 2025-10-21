output "project_id" {
  description = "The project ID"
  value       = var.project_id
}

output "project_number" {
  description = "The project number"
  value       = data.google_project.this.number
}

output "project_name" {
  description = "The project name"
  value       = data.google_project.this.name
}

output "enabled_apis" {
  description = "List of enabled APIs"
  value       = [for service in google_project_service.enabled : service.service]
}

output "labels" {
  description = "Project labels"
  value       = local.project_labels
}