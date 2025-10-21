variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "project_name" {
  description = "The human-readable name for the project"
  type        = string
  default     = null
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "create_project" {
  description = "Whether to create a new project or use existing"
  type        = bool
  default     = false
}

variable "org_id" {
  description = "The organization ID (required if creating project at org level)"
  type        = string
  default     = null
}

variable "parent_folder_id" {
  description = "The folder ID to create project in (alternative to org_id)"
  type        = string
  default     = null
}

variable "billing_account_id" {
  description = "The billing account ID to associate with the project"
  type        = string
  default     = null
}

variable "labels" {
  description = "Labels to apply to the project and resources"
  type        = map(string)
  default     = {}
}