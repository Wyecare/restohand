terraform {
  backend "gcs" {
    bucket = "restohand-terraform-state"
    prefix = "environments/dev"
  }
}