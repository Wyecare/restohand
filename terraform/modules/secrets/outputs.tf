output "jwt_secret_id" {
  description = "JWT secret ID"
  value       = google_secret_manager_secret.jwt_secret.secret_id
}

output "database_url_secret_id" {
  description = "Database URL secret ID"
  value       = google_secret_manager_secret.database_url.secret_id
}


output "mail_from_secret_id" {
  description = "Mail FROM secret ID"
  value       = google_secret_manager_secret.mail_from.secret_id
}

output "frontend_url_secret_id" {
  description = "Frontend URL secret ID (if created)"
  value       = var.frontend_url != null ? google_secret_manager_secret.frontend_url[0].secret_id : null
}


output "secret_accessor_service_account" {
  description = "Secret accessor service account email (if created)"
  value       = var.create_service_account ? google_service_account.secret_accessor[0].email : null
}

output "secret_names" {
  description = "All secret names for reference"
  value = merge(
    {
      jwt_secret    = google_secret_manager_secret.jwt_secret.secret_id
      database_url  = google_secret_manager_secret.database_url.secret_id
      redis_url     = google_secret_manager_secret.redis_url.secret_id
      mail_from     = google_secret_manager_secret.mail_from.secret_id
    },
    var.frontend_url != null ? {
      frontend_url = google_secret_manager_secret.frontend_url[0].secret_id
    } : {},
    { for k, v in google_secret_manager_secret.additional : k => v.secret_id }
  )
}