# Project Configuration
variable "project_id" {
  description = "The GCP project ID for production environment"
  type        = string
}

variable "project_name" {
  description = "Human-readable project name"
  type        = string
  default     = "RestoHand Production Environment"
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "asia-south1"
}

variable "create_project" {
  description = "Whether to create a new project"
  type        = bool
  default     = false
}

variable "org_id" {
  description = "Organization ID (if creating project)"
  type        = string
  default     = null
}

variable "billing_account_id" {
  description = "Billing account ID"
  type        = string
  default     = null
}

# Container Images
variable "image_tag" {
  description = "Tag for container images"
  type        = string
  default     = "latest"
}

variable "api_image" {
  description = "Full container image URI for the API service"
  type        = string
  default     = "gcr.io/cloudrun/hello"
}


# Firebase Configuration - Dual Sites
variable "admin_firebase_site_id" {
  description = "Admin Firebase Hosting site ID"
  type        = string
}

variable "staff_firebase_site_id" {
  description = "Staff Firebase Hosting site ID"
  type        = string
}

variable "customer_firebase_site_id" {
  description = "Customer Firebase Hosting site ID"
  type        = string
  default     = null
}

variable "api_firebase_site_id" {
  description = "API Firebase Hosting site ID"
  type        = string
  default     = null
}

# Legacy variable for backwards compatibility
variable "firebase_site_id" {
  description = "Legacy Firebase Hosting site ID - use admin_firebase_site_id instead"
  type        = string
  default     = null
}

variable "firebase_storage_bucket" {
  description = "Firebase Storage Bucket name"
  type        = string
  default     = null
}

# GitHub Configuration
variable "github_repository" {
  description = "GitHub repository for deployments"
  type        = string
}

# Frontend URLs - Dual Sites
variable "admin_frontend_url" {
  description = "Admin frontend application URL"
  type        = string
  default     = null
}

variable "staff_frontend_url" {
  description = "Staff frontend application URL"
  type        = string
  default     = null
}

variable "customer_frontend_url" {
  description = "Customer frontend application URL"
  type        = string
  default     = null
}


# Legacy frontend URL
variable "frontend_url" {
  description = "Legacy frontend application URL"
  type        = string
  default     = null
}

# SMTP Configuration
variable "smtp_host" {
  description = "SMTP host for email"
  type        = string
  default     = ""
}

variable "smtp_user" {
  description = "SMTP username"
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "SMTP password"
  type        = string
  default     = ""
}


# Database / Firebase configuration
variable "database_url" {
  description = "Database connection URL"
  type        = string
  default     = null
}

variable "firebase_project_id" {
  description = "Firebase project ID"
  type        = string
  default     = ""
}

variable "firebase_client_email" {
  description = "Firebase client email"
  type        = string
  default     = ""
}

variable "firebase_private_key" {
  description = "Firebase private key"
  type        = string
  default     = ""
}


variable "firebase_web_api_key" {
  description = "Firebase web API key"
  type        = string
  default     = ""
}

variable "firebase_private_key_id" {
  description = "Firebase private key ID"
  type        = string
  default     = ""
}

variable "firebase_client_id" {
  description = "Firebase client ID"
  type        = string
  default     = ""
}


# ========================================
# FIREBASE AUTHENTICATION CONFIGURATION
# ========================================

# OAuth Configuration
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
  default     = ["restohand.com"]
}

# Google OAuth Credentials
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

# Apple OAuth Credentials
variable "apple_oauth_client_id" {
  description = "Apple OAuth client ID (Service ID)"
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

# ========================================
# FIREBASE APP CHECK CONFIGURATION
# ========================================

variable "enable_app_check" {
  description = "Enable Firebase App Check for enhanced security"
  type        = bool
  default     = true # Enable for production security
}

variable "recaptcha_site_secret" {
  description = "reCAPTCHA site secret for App Check"
  type        = string
  default     = ""
  sensitive   = true
}

variable "razorpay_key_id" {
    description = "Razorpay API Key ID"
    type        = string
  }

  variable "razorpay_key_secret" {
    description = "Razorpay API Key Secret"
    type        = string
  }

  variable "razorpay_webhook_secret" {
    description = "Razorpay Webhook Secret"
    type        = string
  }


variable "anthropic_api_key" {
  description = "Anthropic API Key for AI integrations"
  type        = string
  default     = ""
}

variable "vapid_key" {
  description = "VAPID key for web push notifications"
  type        = string
  sensitive   = true
}