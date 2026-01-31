resource "google_firebase_android_app" "staff_app" {
  provider            = google-beta
  project             = var.project_id
  display_name       = "Restohand Staff App"
  package_name        = "com.restohand.staff" 
  depends_on          = [module.project]
}



data "google_firebase_android_app_config" "staff_android" {
    provider  = google-beta
    project   = var.project_id
    app_id    = google_firebase_android_app.staff_app.app_id
    depends_on = [google_firebase_android_app.staff_app]
}


resource "google_firebase_apple_app" "staff_ios_app" {
  provider            = google-beta
  project             = var.project_id
  display_name       = "Restohand Staff iOS App"
  bundle_id           = "com.restohand.staff"
  depends_on          = [module.project]
}




data "google_firebase_apple_app_config" "staff_ios" {
    provider  = google-beta
    project   = var.project_id
    app_id    = google_firebase_apple_app.staff_ios_app.app_id
    depends_on = [google_firebase_apple_app.staff_ios_app]
}
