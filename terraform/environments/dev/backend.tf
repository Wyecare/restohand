terraform {
  backend "gcs" {
    bucket = "terraform-state-restohand-d"
    prefix = "restohand/development"
  }
}
