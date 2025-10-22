variable "project_id" {
  description = "ID of the GCP project to manage"
  type        = string
}

variable "project_name" {
  description = "Display name for the project (used when creating a new project)"
  type        = string
  default     = null
}

variable "create_project" {
  description = "Whether this module should create the GCP project"
  type        = bool
  default     = false
}

variable "org_id" {
  description = "Organization ID to attach the project to (required if create_project is true)"
  type        = string
  default     = null
}

variable "billing_account_id" {
  description = "Billing account ID for the project (required if create_project is true)"
  type        = string
  default     = null
}

variable "parent_folder_id" {
  description = "Optional folder ID to place the project under"
  type        = string
  default     = null
}

variable "labels" {
  description = "Common labels to apply to resources"
  type        = map(string)
  default     = {}
}

variable "region" {
  description = "Primary region for regional resources"
  type        = string
}

variable "location" {
  description = "Location for multi-regional resources (defaults to region)"
  type        = string
  default     = null
}

variable "artifact_registry_repository" {
  description = "Name of the Artifact Registry repository"
  type        = string
}

variable "artifact_registry_description" {
  description = "Description for the Artifact Registry repository"
  type        = string
  default     = "Container images for Restohand platform"
}

variable "api_image" {
  description = "Full URI of the container image to deploy for the API service"
  type        = string
}

# REMOVED: worker_image variable - worker functionality now integrated into API service

variable "api_service_name" {
  description = "Cloud Run service name for the API"
  type        = string
  default     = "restohand-api"
}

# REMOVED: worker_service_name variable - no longer needed

variable "database_instance_name" {
  description = "Cloud SQL instance name"
  type        = string
  default     = "restohand-sql"
}

variable "database_tier" {
  description = "Machine tier for Cloud SQL"
  type        = string
  default     = "db-f1-micro"
}

variable "database_version" {
  description = "PostgreSQL version for Cloud SQL"
  type        = string
  default     = "POSTGRES_15"
}

variable "database_name" {
  description = "Default database name"
  type        = string
  default     = "restohand"
}

variable "database_user" {
  description = "Application database user"
  type        = string
  default     = "restohand_app"
}

variable "redis_instance_name" {
  description = "Memorystore Redis instance ID"
  type        = string
  default     = "restohand-redis"
}

variable "redis_memory_size_gb" {
  description = "Redis memory size in GB (reduced after ultra-optimization)"
  type        = number
  default     = 1
}

variable "github_repository" {
  description = "GitHub repository in the form org/repo for workload identity bindings"
  type        = string
}

variable "workload_identity_pool_id" {
  description = "ID for the workload identity pool"
  type        = string
  default     = "github-actions"
}

variable "workload_identity_provider_id" {
  description = "ID for the workload identity provider"
  type        = string
  default     = "github"
}

variable "firebase_site_id" {
  description = "Firebase Hosting site ID"
  type        = string
}

variable "firebase_web_app_display_name" {
  description = "Display name for the Firebase web app"
  type        = string
  default     = "Restohand Web"
}

variable "timezone" {
  description = "Default timezone for scheduled jobs"
  type        = string
  default     = "Asia/Kolkata"
}

variable "scheduler_jobs" {
  description = "Optional Cloud Scheduler jobs to create"
  type = list(object({
    name        = string
    description = optional(string)
    schedule    = string
    uri         = string
    http_method = optional(string, "POST")
  }))
  default = []
}

variable "seed_project_id" {
  description = "Existing project ID to bill organization-level resources from (used for workload identity pool)"
  type        = string
  default     = null
}

variable "ingress_settings" {
  description = "Ingress settings for the Cloud Run services"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
}

variable "vpc_connector_name" {
  description = "Optional Serverless VPC connector name to attach to Cloud Run"
  type        = string
  default     = null
}

variable "min_instances_api" {
  description = "Minimum number of Cloud Run instances for the API"
  type        = number
  default     = 0
}

variable "max_instances_api" {
  description = "Maximum number of Cloud Run instances for the API (includes background workers)"
  type        = number
  default     = 8
}

# REMOVED: min_instances_worker variable - worker functionality integrated into API

# REMOVED: max_instances_worker variable - worker functionality integrated into API

variable "environment" {
  description = "Short environment label (e.g. dev, prod)"
  type        = string
}

variable "mail_from" {
  description = "Default email sender name"
  type        = string
  default     = "Restohand"
}

variable "frontend_url" {
  description = "Public URL for the deployed frontend"
  type        = string
  default     = null
}

variable "allow_unauthenticated" {
  description = "Whether to allow unauthenticated invocations to Cloud Run services"
  type        = bool
  default     = true
}

variable "cloud_run_cpu" {
  description = "vCPU allocation for Cloud Run services"
  type        = string
  default     = "1"
}

variable "cloud_run_memory" {
  description = "Memory allocation for Cloud Run services"
  type        = string
  default     = "512Mi"
}

variable "additional_secrets" {
  description = "Map of additional secret IDs to initial values (empty string creates version placeholder)"
  type        = map(string)
  default     = {}
}

