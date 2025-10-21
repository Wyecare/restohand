

locals {
  github_service_account_id = "${var.environment}-github-deploy"
  workload_identity_pool_id = "${var.environment}-github-pool"
  workload_identity_provider_id = "github-provider"
}

# Service Account for GitHub Actions
resource "google_service_account" "github_deploy" {
  project      = var.project_id
  account_id   = local.github_service_account_id
  display_name = "GitHub Actions Deploy - ${var.environment}"
  description  = "Service account for GitHub Actions deployment to ${var.environment}"
}

# Workload Identity Pool
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = local.workload_identity_pool_id
  display_name              = "GitHub Actions Pool - ${var.environment}"
  description               = "Workload Identity Pool for GitHub Actions - ${var.environment}"
  disabled                  = false
}

# Workload Identity Provider
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = local.workload_identity_provider_id
  display_name                       = "GitHub OIDC Provider"
  description                        = "GitHub OIDC identity provider for ${var.environment}"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
  }

  attribute_condition = var.github_repository_condition
}

# Bind GitHub service account to Workload Identity
resource "google_service_account_iam_member" "github_workload_identity" {
  service_account_id = google_service_account.github_deploy.id
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# IAM roles for GitHub deployment
resource "google_project_iam_member" "github_deploy_permissions" {
  for_each = toset(var.github_deploy_roles)
  project  = var.project_id
  role     = each.value
  member   = "serviceAccount:${google_service_account.github_deploy.email}"
}

# Custom roles (if any)
resource "google_project_iam_custom_role" "custom_roles" {
  for_each    = var.custom_roles
  project     = var.project_id
  role_id     = each.key
  title       = each.value.title
  description = each.value.description
  permissions = each.value.permissions
  stage       = each.value.stage
}

# Bind custom roles
resource "google_project_iam_member" "custom_role_bindings" {
  for_each = var.custom_role_bindings
  project  = var.project_id
  role     = each.value.role
  member   = each.value.member
}

# Service Account for monitoring/alerting
resource "google_service_account" "monitoring" {
  count        = var.enable_monitoring_sa ? 1 : 0
  project      = var.project_id
  account_id   = "${var.environment}-monitoring"
  display_name = "Monitoring Service Account - ${var.environment}"
  description  = "Service account for monitoring and alerting"
}

resource "google_project_iam_member" "monitoring_permissions" {
  count   = var.enable_monitoring_sa ? length(var.monitoring_roles) : 0
  project = var.project_id
  role    = var.monitoring_roles[count.index]
  member  = "serviceAccount:${google_service_account.monitoring[0].email}"
}

# Organization-level IAM bindings (if managing at org level)
resource "google_organization_iam_member" "org_bindings" {
  for_each = var.org_iam_bindings
  org_id   = var.org_id
  role     = each.value.role
  member   = each.value.member
}

# Folder-level IAM bindings (if managing at folder level)
resource "google_folder_iam_member" "folder_bindings" {
  for_each = var.folder_iam_bindings
  folder   = var.folder_id
  role     = each.value.role
  member   = each.value.member
}