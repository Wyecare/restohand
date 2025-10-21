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

variable "frontend_url" {
  description = "Frontend application URL"
  type        = string
  default     = null
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