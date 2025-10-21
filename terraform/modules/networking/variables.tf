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

variable "subnet_cidr" {
  description = "CIDR block for the main subnet"
  type        = string
  default     = "10.8.0.0/28"
}

variable "services_cidr" {
  description = "CIDR block for secondary services range"
  type        = string
  default     = "10.8.1.0/28"
}

variable "connector_min_instances" {
  description = "Minimum instances for VPC connector"
  type        = number
  default     = 2
}

variable "connector_max_instances" {
  description = "Maximum instances for VPC connector"
  type        = number
  default     = 2
}

variable "connector_machine_type" {
  description = "Machine type for VPC connector"
  type        = string
  default     = "e2-micro"
}

variable "enable_nat" {
  description = "Whether to enable NAT gateway for outbound internet access"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to networking resources"
  type        = map(string)
  default     = {}
}
