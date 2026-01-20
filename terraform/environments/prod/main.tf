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
    environment = "prod"
    project     = "restohand-p"
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
  environment        = "prod"
  labels             = local.common_labels

}


# Networking
module "networking" {
  source = "../../modules/networking"

  project_id  = var.project_id
  environment = "prod"
  region      = var.region
  labels      = local.common_labels

  subnet_cidr             = "10.9.0.0/28"
  services_cidr           = "10.9.1.0/28"
  connector_min_instances = 2
  connector_max_instances = 10 # Higher capacity for production
  enable_nat              = true # Enable NAT for production security

  depends_on = [module.project]
}


# Storage and Artifact Registry
module "storage" {
  source = "../../modules/storage"

  project_id  = var.project_id
  environment = "prod"
  region      = var.region
  labels      = local.common_labels

  image_retention_days = 30 # Longer retention for production
  asset_retention_days = 365
  enable_versioning    = true # Enable versioning for production
  enable_backup_bucket = true # Enable backup bucket for production
  enable_cdn           = true # Enable CDN for production

  storage_admins = [] # Will be configured after compute module is created

  depends_on = [module.project]
}

# Secrets
module "secrets" {
  source = "../../modules/secrets"

  project_id         = var.project_id
  environment        = "prod"
  database_url       = var.database_url
  mail_from          = "Restohand Production"
  admin_frontend_url = var.admin_frontend_url
  staff_frontend_url = var.staff_frontend_url
  frontend_url       = var.frontend_url
  customer_frontend_url = var.customer_frontend_url
  labels             = local.common_labels

  additional_secrets = {
    "smtp-host"             = var.smtp_host
    "smtp-user"             = var.smtp_user
    "smtp-pass"             = var.smtp_pass
    "firebase-project-id"     = var.firebase_project_id
    "firebase-client-email"   = var.firebase_client_email
    "firebase-private-key"    = var.firebase_private_key
    "firebase-private-key-id" = var.firebase_private_key_id
    "firebase-client-id"      = var.firebase_client_id
    "razorpay-key-id"       = var.razorpay_key_id
    "razorpay-key-secret"   = var.razorpay_key_secret
    "razorpay-webhook-secret" = var.razorpay_webhook_secret
    "athropic_api_key"       = var.anthropic_api_key
  }

  secret_accessors = [] # Will be configured after deployment

}

module "run_api" {
  source = "../../modules/compute"

  project_id  = var.project_id
  environment = "prod"
  region      = var.region
  timezone    = "Asia/Kolkata"

  api_image                 = local.api_image_url
  api_min_instances         = 0 # Always keep at least 1 instance running in production
  api_max_instances         = 3 # Higher capacity for production
  api_cpu_limit             = "1" # More CPU for production
  api_memory_limit          = "1Gi" # More memory for production
  api_concurrency           = 20 # Higher concurrency for production
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
      FIREBASE_PRIVATE_KEY_ID = {
        secret_name = module.secrets.secret_names["firebase-private-key-id"]
        version     = "latest"
      }
      FIREBASE_CLIENT_ID = {
        secret_name = module.secrets.secret_names["firebase-client-id"]
        version     = "latest"
      }

      ADMIN_FRONTEND_URL = {
        secret_name = module.secrets.secret_names["admin_frontend_url"]
        version     = "latest"
      }
      STAFF_FRONTEND_URL = {
        secret_name = module.secrets.secret_names["staff_frontend_url"]
        version     = "latest"
      }
      FRONTEND_URL = {
        secret_name = module.secrets.secret_names["frontend_url"]
        version     = "latest"
      }
      RAZORPAY_KEY_ID = {
        secret_name = module.secrets.secret_names["razorpay-key-id"]
        version     = "latest"
      }
      RAZORPAY_KEY_SECRET = {
        secret_name = module.secrets.secret_names["razorpay-key-secret"]
        version     = "latest"
      }
      RAZORPAY_WEBHOOK_SECRET = {
        secret_name = module.secrets.secret_names["razorpay-webhook-secret"]
        version     = "latest"
      }

      ANTHROPIC_API_KEY = {
        secret_name = module.secrets.secret_names["athropic_api_key"]
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
  web_app_display_name    = "Restohand Web (Prod)"
  admin_hosting_site_id   = var.admin_firebase_site_id
  staff_hosting_site_id   = var.staff_firebase_site_id
  customer_hosting_site_id = var.customer_firebase_site_id
  hosting_site_id         = var.firebase_site_id  # Legacy support
  enable_preview_channel  = false # Disable preview channels in production
  enable_firebase_storage = true
  enable_firebase_auth    = false # Disable temporarily for initial setup
  enable_firestore        = false # Use PostgreSQL instead
  environment             = "prod"

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
  enable_app_check      = false # Disable temporarily for initial setup
  app_check_enforcement = "ENFORCED" # Enforce App Check in production
  recaptcha_site_secret = var.recaptcha_site_secret

  labels = local.common_labels

  depends_on = [module.project]
}

# IAM and Workload Identity
module "iam" {
  source = "../../modules/iam"

  project_id                  = var.project_id
  environment                 = "prod"
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