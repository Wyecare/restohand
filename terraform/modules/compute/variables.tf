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

variable "timezone" {
  description = "Timezone for the application"
  type        = string
  default     = "Asia/Kolkata"
}

# Container Images
variable "api_image" {
  description = "Container image for the API service"
  type        = string
}

variable "worker_image" {
  description = "Container image for the worker service (optional, defaults to api_image)"
  type        = string
  default     = null
}

# Service Configuration
variable "enable_separate_worker" {
  description = "Deploy worker as a separate Cloud Run service"
  type        = bool
  default     = false
}

variable "worker_type" {
  description = "Type of worker (workforce, resident, all)"
  type        = string
  default     = "all"
}

# API Configuration
variable "api_min_instances" {
  description = "Minimum instances for API service"
  type        = number
  default     = 0
}

variable "api_max_instances" {
  description = "Maximum instances for API service"
  type        = number
  default     = 10
}

variable "api_cpu_limit" {
  description = "CPU limit for API service"
  type        = string
  default     = "2"
}

variable "api_memory_limit" {
  description = "Memory limit for API service"
  type        = string
  default     = "4Gi"
}

variable "api_cpu_idle" {
  description = "Whether API can scale to zero CPU"
  type        = bool
  default     = true
}

variable "api_startup_cpu_boost" {
  description = "Enable startup CPU boost for API"
  type        = bool
  default     = true
}

variable "api_port" {
  description = "Port for the API service"
  type        = number
  default     = 3000
}

variable "api_ingress_setting" {
  description = "Ingress setting for API service"
  type        = string
  default     = "INGRESS_TRAFFIC_ALL"
  validation {
    condition = contains([
      "INGRESS_TRAFFIC_ALL",
      "INGRESS_TRAFFIC_INTERNAL_ONLY",
      "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"
    ], var.api_ingress_setting)
    error_message = "Invalid ingress setting."
  }
}

variable "allow_unauthenticated_api" {
  description = "Allow unauthenticated access to API"
  type        = bool
  default     = true
}

# Worker Configuration
variable "worker_min_instances" {
  description = "Minimum instances for worker service"
  type        = number
  default     = 1
}

variable "worker_max_instances" {
  description = "Maximum instances for worker service"
  type        = number
  default     = 5
}

variable "worker_cpu_limit" {
  description = "CPU limit for worker service"
  type        = string
  default     = "2"
}

variable "worker_memory_limit" {
  description = "Memory limit for worker service"
  type        = string
  default     = "4Gi"
}

# Health Checks
variable "health_check_path" {
  description = "Health check path for API service"
  type        = string
  default     = "/health"
}

variable "worker_health_check_path" {
  description = "Health check path for worker service (optional)"
  type        = string
  default     = null
}

# Network Configuration
variable "vpc_connector_name" {
  description = "VPC connector name"
  type        = string
}

variable "cloudsql_connection_name" {
  description = "Cloud SQL connection name"
  type        = string
}

# Environment Variables
variable "secret_env_vars" {
  description = "Environment variables from secrets"
  type = map(object({
    secret_name = string
    version     = string
  }))
  default = {}
}

variable "additional_env_vars" {
  description = "Additional environment variables"
  type        = map(string)
  default     = {}
}

variable "worker_env_vars" {
  description = "Worker-specific environment variables"
  type        = map(string)
  default     = {}
}

# Annotations
variable "additional_annotations" {
  description = "Additional annotations for Cloud Run services"
  type        = map(string)
  default     = {}
}

# Cloud Scheduler Jobs
variable "scheduler_jobs" {
  description = "Cloud Scheduler jobs configuration"
  type = map(object({
    description = string
    schedule    = string
    path        = string
    payload     = map(any)
    retry_count = number
  }))
  default = {}
}

variable "labels" {
  description = "Labels to apply to compute resources"
  type        = map(string)
  default     = {}
}