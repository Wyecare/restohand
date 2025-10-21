
locals {
  network_name = "${var.environment}-network"
  subnet_name  = "${var.environment}-subnet"
  connector_name = "${var.environment}-connector"
}

# VPC Network
resource "google_compute_network" "main" {
  project                 = var.project_id
  name                    = local.network_name
  auto_create_subnetworks = false
  description             = "VPC network for ${var.environment} environment"
  routing_mode            = "REGIONAL"
}

# Subnet for serverless resources
resource "google_compute_subnetwork" "serverless" {
  project       = var.project_id
  name          = local.subnet_name
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.main.id
  purpose       = "PRIVATE"
  stack_type    = "IPV4_ONLY"

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }

  private_ip_google_access = true
}

# VPC Access Connector for Cloud Run
resource "google_vpc_access_connector" "serverless" {
  project = var.project_id
  name    = local.connector_name
  region  = var.region

  subnet {
    name       = google_compute_subnetwork.serverless.name
    project_id = var.project_id
  }

  min_instances = var.connector_min_instances
  max_instances = (var.connector_min_instances + 1)

  machine_type = var.connector_machine_type
}
# Firewall rules
resource "google_compute_firewall" "allow_internal" {
  project = var.project_id
  name    = "${var.environment}-allow-internal"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.subnet_cidr, var.services_cidr]
  description   = "Allow internal communication within VPC"
}

resource "google_compute_firewall" "allow_health_checks" {
  project = var.project_id
  name    = "${var.environment}-allow-health-checks"
  network = google_compute_network.main.name

  allow {
    protocol = "tcp"
    ports    = ["8080", "3000"]
  }

  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["health-check"]
  description   = "Allow Google Cloud health checks"
}

# NAT Router for outbound internet access (if needed)
resource "google_compute_router" "nat_router" {
  count   = var.enable_nat ? 1 : 0
  project = var.project_id
  name    = "${var.environment}-nat-router"
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "nat_gateway" {
  count  = var.enable_nat ? 1 : 0
  project = var.project_id
  name   = "${var.environment}-nat-gateway"
  router = google_compute_router.nat_router[0].name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}