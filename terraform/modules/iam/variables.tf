variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "github_repository" {
  description = "GitHub repository in format 'owner/repo'"
  type        = string
}

variable "github_repository_condition" {
  description = "Condition for GitHub repository access"
  type        = string
  default     = null
}

variable "github_deploy_roles" {
  description = "IAM roles for GitHub deployment service account"
  type        = list(string)
  default = [
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/firebase.admin"
  ]
}

variable "custom_roles" {
  description = "Custom IAM roles to create"
  type = map(object({
    title       = string
    description = string
    permissions = list(string)
    stage       = string
  }))
  default = {}
}

variable "custom_role_bindings" {
  description = "Custom role bindings"
  type = map(object({
    role   = string
    member = string
  }))
  default = {}
}

variable "enable_monitoring_sa" {
  description = "Create monitoring service account"
  type        = bool
  default     = false
}

variable "monitoring_roles" {
  description = "IAM roles for monitoring service account"
  type        = list(string)
  default = [
    "roles/monitoring.metricWriter",
    "roles/logging.logWriter",
    "roles/cloudtrace.agent"
  ]
}

variable "org_id" {
  description = "Organization ID for org-level IAM bindings"
  type        = string
  default     = null
}

variable "folder_id" {
  description = "Folder ID for folder-level IAM bindings"
  type        = string
  default     = null
}

variable "org_iam_bindings" {
  description = "Organization-level IAM bindings"
  type = map(object({
    role   = string
    member = string
  }))
  default = {}
}

variable "folder_iam_bindings" {
  description = "Folder-level IAM bindings"
  type = map(object({
    role   = string
    member = string
  }))
  default = {}
}