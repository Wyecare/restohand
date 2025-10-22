output "network_id" {
  description = "The ID of the VPC network"
  value       = google_compute_network.main.id
}

output "network_name" {
  description = "The name of the VPC network"
  value       = google_compute_network.main.name
}

output "subnet_id" {
  description = "The ID of the subnet"
  value       = google_compute_subnetwork.serverless.id
}

output "subnet_name" {
  description = "The name of the subnet"
  value       = google_compute_subnetwork.serverless.name
}

output "vpc_connector_id" {
  description = "The ID of the VPC connector"
  value       = google_vpc_access_connector.serverless.id
}

output "vpc_connector_name" {
  description = "The name of the VPC connector"
  value       = google_vpc_access_connector.serverless.name
}
