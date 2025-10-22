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

variable "labels" {
  description = "Labels to apply to Cloud Run resources"
  type        = map(string)
  default     = {}
}

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
  default     = "1"
}

variable "api_memory_limit" {
  description = "Memory limit for API service"
  type        = string
  default     = "1Gi"
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

variable "api_concurrency" {
  description = "Maximum number of concurrent requests per instance"
  type        = number
  default     = 80
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

# Health Checks
variable "health_check_path" {
  description = "Health check path for API service"
  type        = string
  default     = "/health"
}

# Network Configuration
variable "vpc_connector_name" {
  description = "VPC connector resource path (projects/PROJECT/locations/REGION/connectors/NAME)"
  type        = string
  default     = ""
}

variable "cloudsql_connection_name" {
  description = "Cloud SQL connection name"
  type        = string
  default     = ""
}

variable "vpc_egress" {
  description = "VPC egress setting when connector is used"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
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
