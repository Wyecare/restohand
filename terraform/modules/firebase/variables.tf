variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "web_app_display_name" {
  description = "Display name for the Firebase web app"
  type        = string
}

variable "hosting_site_id" {
  description = "Site ID for Firebase Hosting"
  type        = string
}

variable "enable_preview_channel" {
  description = "Enable preview channel for Firebase Hosting"
  type        = bool
  default     = true
}

variable "preview_channel_ttl" {
  description = "TTL for preview channel"
  type        = string
  default     = "2592000s"  # 30 days
}

variable "enable_firebase_storage" {
  description = "Enable Firebase Storage"
  type        = bool
  default     = true
}

variable "storage_location" {
  description = "Location for Firebase Storage"
  type        = string
  default     = "US"
}

variable "enable_storage_versioning" {
  description = "Enable versioning for Firebase Storage"
  type        = bool
  default     = false
}

variable "storage_lifecycle_days" {
  description = "Days after which to delete old storage objects"
  type        = number
  default     = 365
}

variable "cors_origins" {
  description = "CORS origins for Firebase Storage"
  type        = list(string)
  default     = ["*"]
}

variable "enable_firebase_auth" {
  description = "Enable Firebase Authentication"
  type        = bool
  default     = true
}

variable "auth_allow_duplicate_emails" {
  description = "Allow duplicate emails in Firebase Auth"
  type        = bool
  default     = false
}

variable "auth_enable_anonymous" {
  description = "Enable anonymous authentication"
  type        = bool
  default     = false
}

variable "auth_enable_email" {
  description = "Enable email authentication"
  type        = bool
  default     = true
}

variable "auth_email_password_required" {
  description = "Require password for email authentication"
  type        = bool
  default     = true
}

variable "auth_enable_phone" {
  description = "Enable phone number authentication"
  type        = bool
  default     = false
}

variable "enable_firestore" {
  description = "Enable Firestore database"
  type        = bool
  default     = false
}

variable "firestore_location" {
  description = "Location for Firestore database"
  type        = string
  default     = "us-central"
}

variable "firestore_type" {
  description = "Type of Firestore database"
  type        = string
  default     = "FIRESTORE_NATIVE"
}

variable "firestore_point_in_time_recovery" {
  description = "Enable point-in-time recovery for Firestore"
  type        = string
  default     = "DISABLED"
}

variable "enable_app_check" {
  description = "Enable Firebase App Check"
  type        = bool
  default     = false
}

variable "app_check_ios_app_id" {
  description = "iOS app ID for App Check"
  type        = string
  default     = null
}

variable "app_check_android_app_id" {
  description = "Android app ID for App Check"
  type        = string
  default     = null
}

variable "app_check_web_app_id" {
  description = "Web app ID for App Check"
  type        = string
  default     = null
}

variable "app_check_token_ttl" {
  description = "Token TTL for App Check"
  type        = string
  default     = "3600s"
}

variable "recaptcha_site_secret" {
  description = "reCAPTCHA site secret for App Check"
  type        = string
  default     = null
  sensitive   = true
}

# Mobile App Variables
variable "enable_android_app" {
  description = "Enable Android app creation"
  type        = bool
  default     = true
}

variable "enable_ios_app" {
  description = "Enable iOS app creation"
  type        = bool
  default     = true
}

variable "android_app_display_name" {
  description = "Display name for the Android app"
  type        = string
  default     = "Restohand"
}

variable "android_package_name" {
  description = "Android package name"
  type        = string
  default     = "com.restohand.app"
}

variable "android_sha1_hashes" {
  description = "SHA1 hashes for Android app (for debug/release certificates)"
  type        = list(string)
  default     = []
}

variable "android_sha256_hashes" {
  description = "SHA256 hashes for Android app"
  type        = list(string)
  default     = []
}

variable "ios_app_display_name" {
  description = "Display name for the iOS app"
  type        = string
  default     = "Restohand"
}

variable "ios_bundle_id" {
  description = "iOS bundle identifier"
  type        = string
  default     = "com.restohand.app"
}

variable "ios_app_store_id" {
  description = "iOS App Store ID"
  type        = string
  default     = ""
}

variable "ios_team_id" {
  description = "iOS Team ID"
  type        = string
  default     = ""
}

# App Check Enhancement Variables
variable "app_check_enforcement" {
  description = "App Check enforcement level (UNENFORCED or ENFORCED)"
  type        = string
  default     = "UNENFORCED"
  validation {
    condition     = contains(["UNENFORCED", "ENFORCED"], var.app_check_enforcement)
    error_message = "app_check_enforcement must be either 'UNENFORCED' or 'ENFORCED'."
  }
}

# Authentication Enhancement Variables
variable "auth_google_enabled" {
  description = "Enable Google OAuth authentication"
  type        = bool
  default     = true
}

variable "auth_apple_enabled" {
  description = "Enable Apple OAuth authentication"
  type        = bool
  default     = true
}

variable "auth_authorized_domains" {
  description = "Authorized domains for authentication"
  type        = list(string)
  default     = []
}

variable "google_oauth_client_id" {
  description = "Google OAuth client ID"
  type        = string
  default     = ""
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_oauth_client_id" {
  description = "Apple OAuth client ID"
  type        = string
  default     = ""
}

variable "apple_oauth_key_id" {
  description = "Apple OAuth key ID"
  type        = string
  default     = ""
}

variable "apple_oauth_private_key" {
  description = "Apple OAuth private key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "apple_oauth_team_id" {
  description = "Apple OAuth team ID"
  type        = string
  default     = ""
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "labels" {
  description = "Labels to apply to Firebase resources"
  type        = map(string)
  default     = {}
}