variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "database_url" {
  description = "Database connection URL"
  type        = string
  sensitive   = true
}

variable "mail_from" {
  description = "Default email FROM address"
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
  description = "Customer QR frontend application URL"
  type        = string
  default     = null
}

# Legacy frontend URL
variable "frontend_url" {
  description = "Legacy frontend application URL"
  type        = string
  default     = null
}

variable "additional_secrets" {
  description = "Additional secrets to create"
  type        = map(string)
  default     = {}
  sensitive   = false  # Cannot use sensitive values in for_each
}

variable "secret_accessors" {
  description = "List of service accounts that need access to secrets"
  type        = list(string)
  default     = []
}

variable "create_service_account" {
  description = "Create a service account for secret access"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to secret resources"
  type        = map(string)
  default     = {}
}