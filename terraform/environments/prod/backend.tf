terraform {
  backend "gcs" {
    bucket = "terraform-state-restohand"
    prefix = "restohand/production"
  }
}