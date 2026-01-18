
# Enable required APIs
resource "google_project_service" "firebase_storage_api" {
  count   = var.enable_firebase_storage ? 1 : 0
  project = var.project_id
  service = "firebasestorage.googleapis.com"

  disable_dependent_services = false
  disable_on_destroy        = false
}

# Firebase Project
resource "google_firebase_project" "default" {
  provider = google-beta
  project  = var.project_id
}

# Firebase Web App
resource "google_firebase_web_app" "default" {
  provider     = google-beta
  project      = var.project_id
  display_name = var.web_app_display_name

  depends_on = [google_firebase_project.default]
}

# Firebase Web App Config
data "google_firebase_web_app_config" "default" {
  provider   = google-beta
  project    = var.project_id
  web_app_id = google_firebase_web_app.default.app_id

  depends_on = [google_firebase_web_app.default]
}

# Admin Firebase Hosting Site
resource "google_firebase_hosting_site" "admin" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.admin_hosting_site_id

  depends_on = [google_firebase_project.default]
}

# Staff Firebase Hosting Site
resource "google_firebase_hosting_site" "staff" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.staff_hosting_site_id

  depends_on = [google_firebase_project.default]
}

# Customer Firebase Hosting Site
resource "google_firebase_hosting_site" "customer" {
  provider = google-beta
  project  = var.project_id
  site_id  = var.customer_hosting_site_id
  depends_on = [google_firebase_project.default]
}

# Legacy site for backwards compatibility
resource "google_firebase_hosting_site" "default" {
  count    = var.hosting_site_id != null ? 1 : 0
  provider = google-beta
  project  = var.project_id
  site_id  = var.hosting_site_id

  depends_on = [google_firebase_project.default]
}

# Firebase Hosting Channel for preview deployments (Admin)
resource "google_firebase_hosting_channel" "admin_preview" {
  count      = var.enable_preview_channel ? 1 : 0
  provider   = google-beta
  site_id    = google_firebase_hosting_site.admin.site_id
  channel_id = "admin-preview"
  ttl        = var.preview_channel_ttl

  depends_on = [google_firebase_hosting_site.admin]
}

# Firebase Hosting Channel for preview deployments (Staff)
resource "google_firebase_hosting_channel" "staff_preview" {
  count      = var.enable_preview_channel ? 1 : 0
  provider   = google-beta
  site_id    = google_firebase_hosting_site.staff.site_id
  channel_id = "staff-preview"
  ttl        = var.preview_channel_ttl

  depends_on = [google_firebase_hosting_site.staff]
}

# Legacy preview channel for backwards compatibility
resource "google_firebase_hosting_channel" "preview" {
  count      = var.enable_preview_channel && var.hosting_site_id != null ? 1 : 0
  provider   = google-beta
  site_id    = google_firebase_hosting_site.default[0].site_id
  channel_id = "preview"
  ttl        = var.preview_channel_ttl

  depends_on = [google_firebase_hosting_site.default]
}

# Storage bucket for Firebase Storage
resource "google_storage_bucket" "firebase_storage" {
  count                       = var.enable_firebase_storage ? 1 : 0
  project                     = var.project_id
  name                        = "${var.project_id}-firebase"
  location                    = var.storage_location
  force_destroy = true
  uniform_bucket_level_access = true

  versioning {
    enabled = var.enable_storage_versioning
  }

  lifecycle_rule {
    condition {
      age = var.storage_lifecycle_days
    }
    action {
      type = "Delete"
    }
  }

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = var.labels

  depends_on = [
    google_firebase_project.default,
    google_project_service.firebase_storage_api
  ]
}

# Firebase Storage Rules (basic secure rules)
resource "google_firebase_storage_bucket" "firebase_storage_bucket" {
  count     = var.enable_firebase_storage ? 1 : 0
  provider  = google-beta
  project   = var.project_id
  bucket_id = google_storage_bucket.firebase_storage[0].name

  depends_on = [
    google_firebase_project.default,
    google_storage_bucket.firebase_storage,
    google_project_service.firebase_storage_api
  ]
}

# Firebase Auth (optional configuration)
resource "google_identity_platform_config" "auth_config" {
  count   = var.enable_firebase_auth ? 1 : 0
  project = var.project_id

  sign_in {
    allow_duplicate_emails = var.auth_allow_duplicate_emails

    dynamic "anonymous" {
      for_each = var.auth_enable_anonymous ? [1] : []
      content {
        enabled = true
      }
    }

    email {
      enabled           = var.auth_enable_email
      password_required = var.auth_email_password_required
    }

    dynamic "phone_number" {
      for_each = var.auth_enable_phone ? [1] : []
      content {
        enabled = true
      }
    }
  }

  depends_on = [google_firebase_project.default]
}

# Firebase Firestore (optional)
resource "google_firestore_database" "firestore" {
  count                           = var.enable_firestore ? 1 : 0
  project                         = var.project_id
  name                            = "(default)"
  location_id                     = var.firestore_location
  type                            = var.firestore_type
  concurrency_mode               = "OPTIMISTIC"
  app_engine_integration_mode    = "DISABLED"
  point_in_time_recovery_enablement = var.firestore_point_in_time_recovery

  depends_on = [google_firebase_project.default]
}

# Legacy App Check configurations (kept for backwards compatibility)
# These use manually specified app IDs via variables

# ========================================
# ENHANCED AUTHENTICATION SECTION
# ========================================

# Google OAuth Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "google_oauth" {
  count         = var.enable_firebase_auth && var.auth_google_enabled && var.google_oauth_client_id != "" ? 1 : 0
  provider      = google-beta
  project       = var.project_id
  idp_id        = "google.com"
  client_id     = var.google_oauth_client_id
  client_secret = var.google_oauth_client_secret
  enabled       = true

  depends_on = [google_identity_platform_config.auth_config]
}

# Apple OAuth Provider Configuration
resource "google_identity_platform_default_supported_idp_config" "apple_oauth" {
  count         = var.enable_firebase_auth && var.auth_apple_enabled && var.apple_oauth_client_id != "" ? 1 : 0
  provider      = google-beta
  project       = var.project_id
  idp_id        = "apple.com"
  client_id     = var.apple_oauth_client_id
  client_secret = var.apple_oauth_private_key != "" ? var.apple_oauth_private_key : "placeholder"
  enabled       = true

  depends_on = [google_identity_platform_config.auth_config]
}

# Apple OAuth Key Configuration (separate resource for Apple-specific config)
resource "google_identity_platform_oauth_idp_config" "apple_oauth_detailed" {
  count        = var.enable_firebase_auth && var.auth_apple_enabled && var.apple_oauth_private_key != "" ? 1 : 0
  provider     = google-beta
  project      = var.project_id
  name         = "apple.com"
  display_name = "Apple"
  enabled      = true
  issuer       = "https://appleid.apple.com"
  client_id    = var.apple_oauth_client_id

  client_secret = jsonencode({
    "type" : "service_account",
    "client_id" : var.apple_oauth_client_id,
    "private_key_id" : var.apple_oauth_key_id,
    "private_key" : var.apple_oauth_private_key,
    "team_id" : var.apple_oauth_team_id
  })

  depends_on = [google_identity_platform_config.auth_config]
}

# ========================================
# ENHANCED APP CHECK SECTION
# ========================================

# App Check Service Configuration
resource "google_firebase_app_check_service_config" "api_service" {
  count                       = var.enable_app_check ? 1 : 0
  provider                    = google-beta
  project                     = var.project_id
  service_id                  = "identitytoolkit.googleapis.com"
  enforcement_mode            = var.app_check_enforcement

  depends_on = [google_firebase_project.default]
}

resource "google_firebase_app_check_service_config" "firestore_service" {
  count                       = var.enable_app_check && var.enable_firestore ? 1 : 0
  provider                    = google-beta
  project                     = var.project_id
  service_id                  = "firestore.googleapis.com"
  enforcement_mode            = var.app_check_enforcement

  depends_on = [google_firebase_project.default]
}

resource "google_firebase_app_check_service_config" "storage_service" {
  count                       = var.enable_app_check && var.enable_firebase_storage ? 1 : 0
  provider                    = google-beta
  project                     = var.project_id
  service_id                  = "storage.googleapis.com"
  enforcement_mode            = var.app_check_enforcement

  depends_on = [google_firebase_project.default]
}


# App Check Configuration for Web App
resource "google_firebase_app_check_recaptcha_v3_config" "web_app_check" {
  count       = var.enable_app_check && var.recaptcha_site_secret != null ? 1 : 0
  provider    = google-beta
  project     = var.project_id
  app_id      = google_firebase_web_app.default.app_id
  site_secret = var.recaptcha_site_secret
  token_ttl   = var.app_check_token_ttl

  depends_on = [google_firebase_web_app.default]
}