output "artifact_registry_repository" {
  description = "Artifact Registry repository ID"
  value       = google_artifact_registry_repository.containers.repository_id
}

output "artifact_registry_location" {
  description = "Artifact Registry location"
  value       = google_artifact_registry_repository.containers.location
}

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = "${google_artifact_registry_repository.containers.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "assets_bucket_name" {
  description = "Assets bucket name"
  value       = google_storage_bucket.assets.name
}

output "assets_bucket_url" {
  description = "Assets bucket URL"
  value       = google_storage_bucket.assets.url
}

output "backup_bucket_name" {
  description = "Backup bucket name (if enabled)"
  value       = var.enable_backup_bucket ? google_storage_bucket.backups[0].name : null
}

output "cdn_url" {
  description = "CDN URL (if enabled)"
  value       = var.enable_cdn ? "https://${google_compute_global_forwarding_rule.assets_forwarding_rule[0].ip_address}" : null
}