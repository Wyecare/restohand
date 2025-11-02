terraform {
  backend "gcs" {
    bucket = "terraform-state-restohand-prod"
    prefix = "restohand/production"
  }
}