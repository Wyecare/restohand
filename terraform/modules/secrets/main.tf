

# JWT Secret
resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "jwt-secret"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Database URL Secret
resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "database-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_url
}



# Mail Configuration
resource "google_secret_manager_secret" "mail_from" {
  project   = var.project_id
  secret_id = "mail-from"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "mail_from" {
  secret      = google_secret_manager_secret.mail_from.id
  secret_data = var.mail_from
}

# Admin Frontend URL (optional)
resource "google_secret_manager_secret" "admin_frontend_url" {
  count     = var.admin_frontend_url != null ? 1 : 0
  project   = var.project_id
  secret_id = "admin-frontend-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "admin_frontend_url" {
  count       = var.admin_frontend_url != null ? 1 : 0
  secret      = google_secret_manager_secret.admin_frontend_url[0].id
  secret_data = var.admin_frontend_url
}

# Staff Frontend URL (optional)
resource "google_secret_manager_secret" "staff_frontend_url" {
  count     = var.staff_frontend_url != null ? 1 : 0
  project   = var.project_id
  secret_id = "staff-frontend-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "staff_frontend_url" {
  count       = var.staff_frontend_url != null ? 1 : 0
  secret      = google_secret_manager_secret.staff_frontend_url[0].id
  secret_data = var.staff_frontend_url
}

# Legacy Frontend URL (optional)
resource "google_secret_manager_secret" "frontend_url" {
  count     = var.frontend_url != null ? 1 : 0
  project   = var.project_id
  secret_id = "frontend-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "frontend_url" {
  count       = var.frontend_url != null ? 1 : 0
  secret      = google_secret_manager_secret.frontend_url[0].id
  secret_data = var.frontend_url
}

# Additional secrets from variables
resource "google_secret_manager_secret" "additional" {
  for_each  = var.additional_secrets
  project   = var.project_id
  secret_id = each.key

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "additional" {
  for_each    = { for k, v in var.additional_secrets : k => v if v != "" }
  secret      = google_secret_manager_secret.additional[each.key].id
  secret_data = each.value
}

# Service Account for Secret Access
resource "google_service_account" "secret_accessor" {
  count        = var.create_service_account ? 1 : 0
  project      = var.project_id
  account_id   = "${var.environment}-secret-accessor"
  display_name = "Secret Accessor for ${var.environment}"
}

# IAM bindings for secret access
resource "google_secret_manager_secret_iam_member" "jwt_secret_access" {
  count     = length(var.secret_accessors)
  project   = var.project_id
  secret_id = google_secret_manager_secret.jwt_secret.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.secret_accessors[count.index]
}

resource "google_secret_manager_secret_iam_member" "database_url_access" {
  count     = length(var.secret_accessors)
  project   = var.project_id
  secret_id = google_secret_manager_secret.database_url.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = var.secret_accessors[count.index]
}


resource "google_secret_manager_secret_iam_member" "additional_access" {
  for_each = {
    for pair in setproduct(keys(var.additional_secrets), var.secret_accessors) :
    "${pair[0]}-${pair[1]}" => {
      secret_id = pair[0]
      member    = pair[1]
    }
  }

  project   = var.project_id
  secret_id = google_secret_manager_secret.additional[each.value.secret_id].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = each.value.member
}