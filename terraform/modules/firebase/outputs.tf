output "web_app_id" {
  description = "Firebase web app ID"
  value       = google_firebase_web_app.default.app_id
}

output "web_app_config" {
  description = "Firebase web app configuration"
  value = {
    api_key             = data.google_firebase_web_app_config.default.api_key
    auth_domain         = data.google_firebase_web_app_config.default.auth_domain
    project_id          = var.project_id
    database_url        = try(data.google_firebase_web_app_config.default.database_url, null)
    storage_bucket      = try(data.google_firebase_web_app_config.default.storage_bucket, null)
    messaging_sender_id = try(data.google_firebase_web_app_config.default.messaging_sender_id, null)
    app_id              = google_firebase_web_app.default.app_id
    measurement_id      = try(data.google_firebase_web_app_config.default.measurement_id, null)
  }
}

# Dual hosting sites outputs
output "admin_hosting_site_id" {
  description = "Admin Firebase Hosting site ID"
  value       = google_firebase_hosting_site.admin.site_id
}

output "admin_hosting_site_name" {
  description = "Admin Firebase Hosting site name"
  value       = google_firebase_hosting_site.admin.name
}

output "staff_hosting_site_id" {
  description = "Staff Firebase Hosting site ID"
  value       = google_firebase_hosting_site.staff.site_id
}

output "staff_hosting_site_name" {
  description = "Staff Firebase Hosting site name"
  value       = google_firebase_hosting_site.staff.name
}

output "admin_preview_channel_name" {
  description = "Admin Firebase Hosting preview channel name"
  value       = var.enable_preview_channel ? google_firebase_hosting_channel.admin_preview[0].name : null
}

output "staff_preview_channel_name" {
  description = "Staff Firebase Hosting preview channel name"
  value       = var.enable_preview_channel ? google_firebase_hosting_channel.staff_preview[0].name : null
}

# Legacy outputs for backwards compatibility
output "hosting_site_id" {
  description = "Legacy Firebase Hosting site ID"
  value       = var.hosting_site_id != null ? google_firebase_hosting_site.default[0].site_id : google_firebase_hosting_site.admin.site_id
}

output "hosting_site_name" {
  description = "Legacy Firebase Hosting site name"
  value       = var.hosting_site_id != null ? google_firebase_hosting_site.default[0].name : google_firebase_hosting_site.admin.name
}

output "preview_channel_name" {
  description = "Legacy Firebase Hosting preview channel name"
  value       = var.enable_preview_channel && var.hosting_site_id != null ? google_firebase_hosting_channel.preview[0].name : null
}

output "storage_bucket_name" {
  description = "Firebase Storage bucket name"
  value       = var.enable_firebase_storage ? google_storage_bucket.firebase_storage[0].name : null
}

output "firestore_database_name" {
  description = "Firestore database name"
  value       = var.enable_firestore ? google_firestore_database.firestore[0].name : null
}

# ========================================
# ENHANCED OUTPUTS
# ========================================


# Firebase Project Details
output "firebase_project_details" {
  description = "Firebase project details"
  value = {
    project_id           = var.project_id
    admin_hosting_site_id = google_firebase_hosting_site.admin.site_id
    staff_hosting_site_id = google_firebase_hosting_site.staff.site_id
    auth_enabled         = var.enable_firebase_auth
    storage_enabled      = var.enable_firebase_storage
    firestore_enabled    = var.enable_firestore
    app_check_enabled    = var.enable_app_check
  }
}

