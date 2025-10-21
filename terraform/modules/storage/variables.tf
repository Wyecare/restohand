variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "storage_location" {
  description = "Storage location (region or multi-region)"
  type        = string
  default     = "US"
}

# Artifact Registry
variable "image_retention_days" {
  description = "Number of days to retain container images"
  type        = number
  default     = 30
}

# Cloud Storage
variable "enable_versioning" {
  description = "Enable object versioning in storage bucket"
  type        = bool
  default     = true
}

variable "asset_retention_days" {
  description = "Number of days before moving assets to cheaper storage class"
  type        = number
  default     = 30
}

variable "enable_cors" {
  description = "Enable CORS for the storage bucket"
  type        = bool
  default     = true
}

variable "cors_origins" {
  description = "CORS origins for the storage bucket"
  type        = list(string)
  default     = ["*"]
}

variable "storage_admins" {
  description = "List of members who need admin access to storage"
  type        = list(string)
  default     = []
}

variable "storage_viewers" {
  description = "List of members who need viewer access to storage"
  type        = list(string)
  default     = []
}

# Backup bucket
variable "enable_backup_bucket" {
  description = "Create a separate bucket for backups"
  type        = bool
  default     = true
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 90
}

# CDN
variable "enable_cdn" {
  description = "Enable CDN for static assets"
  type        = bool
  default     = false
}

variable "ssl_certificate_ids" {
  description = "List of SSL certificate IDs for CDN"
  type        = list(string)
  default     = []
}

variable "labels" {
  description = "Labels to apply to storage resources"
  type        = map(string)
  default     = {}
}