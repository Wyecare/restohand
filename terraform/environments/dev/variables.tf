# Project Configuration
variable "project_id" {
  description = "The GCP project ID for development environment"
  type        = string
}

variable "project_name" {
  description = "Human-readable project name"
  type        = string
  default     = "RestoHand Dev Environment"
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