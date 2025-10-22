terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "6.8.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Local values
locals {
  common_labels = {
    environment = "dev"
    project     = "restohand"
    managed_by  = "terraform"
    team        = "engineering"
  }

  api_image_url = var.api_image
}

module "project" {
  source             = "../../modules/project"
  project_id         = var.project_id
  project_name       = var.project_name
  org_id             = var.org_id
  billing_account_id = var.billing_account_id
  create_project     = var.create_project
  environment        = "dev"
  labels             = local.common_labels

}


# Networking
module "networking" {
  source = "../../modules/networking"

  project_id  = var.project_id
  environment = "dev"
  region      = var.region
  labels      = local.common_labels

  subnet_cidr             = "10.8.0.0/28"
  services_cidr           = "10.8.1.0/28"
  connector_min_instances = 2 # Minimum allowed by GCP
  connector_max_instances = 2 # Keep capped for costs
  enable_nat              = false

  depends_on = [module.project]
}


# Storage and Artifact Registry
module "storage" {
  source = "../../modules/storage"

  project_id  = var.project_id
  environment = "dev"
  region      = var.region
  labels      = local.common_labels

  image_retention_days = 7 # Shorter retention for dev
  asset_retention_days = 30
  enable_versioning    = false
  enable_backup_bucket = false # No backup bucket for dev
  enable_cdn           = false # No CDN for dev

  storage_admins = [] # Will be configured after compute module is created

  depends_on = [module.project]
}

# Secrets
module "secrets" {
  source = "../../modules/secrets"

  project_id   = var.project_id
  environment  = "dev"
  database_url = var.database_url
  mail_from    = "Restohand Development"
  frontend_url = var.frontend_url
  labels       = local.common_labels

  additional_secrets = {
    "smtp-host"             = var.smtp_host
    "smtp-user"             = var.smtp_user
    "smtp-pass"             = var.smtp_pass
    "firebase-project-id"   = var.firebase_project_id
    "firebase-client-email" = var.firebase_client_email
    "firebase-private-key"  = var.firebase_private_key
    "firebase-web-api-key"  = var.firebase_web_api_key
  }

  secret_accessors = [] # Will be configured after deployment

}

module "run_api" {
  source = "../../modules/compute"

  project_id  = var.project_id
  environment = "dev"
  region      = var.region
  timezone    = "Asia/Kolkata"

  api_image                 = local.api_image_url
  api_min_instances         = 0
  api_max_instances         = 3
  api_cpu_limit             = "1"
  api_memory_limit          = "1Gi"
  api_concurrency           = 20
  api_ingress_setting       = "INGRESS_TRAFFIC_ALL"
  allow_unauthenticated_api = true
  labels                    = local.common_labels

  vpc_connector_name = module.networking.vpc_connector_id

  secret_env_vars = merge(
    {
      DATABASE_URL = {
        secret_name = module.secrets.database_url_secret_id
        version     = "latest"
      }
      MONGODB_URI = {
        secret_name = module.secrets.database_url_secret_id
        version     = "latest"
      }
      JWT_SECRET = {
        secret_name = module.secrets.jwt_secret_id
        version     = "latest"
      }
      MAIL_FROM = {
        secret_name = module.secrets.mail_from_secret_id
        version     = "latest"
      }
    },
    module.secrets.frontend_url_secret_id != null ? {
      FRONTEND_URL = {
        secret_name = module.secrets.frontend_url_secret_id
        version     = "latest"
      }
    } : {},
    {
      SMTP_HOST = {
        secret_name = module.secrets.secret_names["smtp-host"]
        version     = "latest"
      }
      SMTP_USER = {
        secret_name = module.secrets.secret_names["smtp-user"]
        version     = "latest"
      }
      SMTP_PASS = {
        secret_name = module.secrets.secret_names["smtp-pass"]
        version     = "latest"
      }
      FIREBASE_PROJECT_ID = {
        secret_name = module.secrets.secret_names["firebase-project-id"]
        version     = "latest"
      }
      FIREBASE_CLIENT_EMAIL = {
        secret_name = module.secrets.secret_names["firebase-client-email"]
        version     = "latest"
      }
      FIREBASE_PRIVATE_KEY = {
        secret_name = module.secrets.secret_names["firebase-private-key"]
        version     = "latest"
      }
      FIREBASE_WEB_API_KEY = {
        secret_name = module.secrets.secret_names["firebase-web-api-key"]
        version     = "latest"
      }
    }
  )

  depends_on = [
    module.networking,
    module.secrets
  ]
}

# Firebase
module "firebase" {
  source = "../../modules/firebase"

  project_id              = var.project_id
  web_app_display_name    = "Restohand Web (Dev)"
  hosting_site_id         = var.firebase_site_id
  enable_preview_channel  = true
  enable_firebase_storage = true  # Disable until domain verification completed
  enable_firebase_auth    = false # Disable until quota project is configured
  enable_firestore        = false # Use PostgreSQL instead
  environment             = "dev"

  # Authentication Configuration
  auth_enable_anonymous      = false
  auth_enable_email          = true
  auth_enable_phone          = true
  auth_google_enabled        = var.auth_google_enabled
  auth_apple_enabled         = var.auth_apple_enabled
  auth_authorized_domains    = var.auth_authorized_domains
  google_oauth_client_id     = var.google_oauth_client_id
  google_oauth_client_secret = var.google_oauth_client_secret
  apple_oauth_client_id      = var.apple_oauth_client_id
  apple_oauth_key_id         = var.apple_oauth_key_id
  apple_oauth_private_key    = var.apple_oauth_private_key
  apple_oauth_team_id        = var.apple_oauth_team_id

  # App Check Configuration
  enable_app_check      = var.enable_app_check
  app_check_enforcement = "UNENFORCED" # Start with unenforced for dev
  recaptcha_site_secret = var.recaptcha_site_secret

  labels = local.common_labels

  depends_on = [module.project]
}

# IAM and Workload Identity
module "iam" {
  source = "../../modules/iam"

  project_id                  = var.project_id
  environment                 = "dev"
  github_repository           = var.github_repository
  github_repository_condition = "attribute.repository==\"${var.github_repository}\""

  github_deploy_roles = [
    "roles/run.admin",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/firebase.admin",
    "roles/secretmanager.admin",
    "roles/resourcemanager.projectIamAdmin",
    "roles/vpcaccess.admin",
    "roles/storage.admin",
    "roles/iam.workloadIdentityPoolAdmin",
    "roles/iam.serviceAccountAdmin",
    "roles/compute.networkAdmin",
    "roles/iam.roleAdmin"
  ]


  enable_monitoring_sa = true

  depends_on = [module.project]
}
