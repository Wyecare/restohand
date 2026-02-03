# Configuration Guide

This workspace uses environment files for both the NestJS backend and the Vite frontend. Copy the provided examples and adjust the values for each deployment environment.

## Quick Start

1. Duplicate the root file: `cp .env.example .env`
2. Duplicate the frontend file: `cp apps/frontend/.env.example apps/frontend/.env`
3. Update the copies with environment-specific secrets and URLs.
4. Restart any running dev servers so that environment changes are picked up.

> ⚠️ Never commit populated `.env` files to source control. Add secrets to the target hosting platform (GCP Secret Manager, Cloud Run, Firebase, etc.) instead.

## Backend Variables (`.env`)

| Key                                   | Required | Default                                             | Description                                                       |
| ------------------------------------- | -------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`                            | No       | `development`                                       | Node environment flag used for logging and diagnostics.           |
| `API_PORT`                            | No       | `3000`                                              | Port for the NestJS HTTP server.                                  |
| `API_GLOBAL_PREFIX`                   | No       | `api`                                               | Global prefix applied to all REST routes.                         |
| `LOG_LEVEL`                           | No       | `debug`                                             | Intended logging verbosity (hook into Nest logger later).         |
| `MONGODB_URI`                         | **Yes**  | –                                                   | Connection string for the MongoDB cluster.                        |
| `MONGODB_DB_NAME`                     | No       | `restohand`                                         | Optional database override when the URI omits the db segment.     |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | No       | `5000`                                              | Milliseconds to wait for MongoDB server selection before failing. |
| `JWT_SECRET`                          | **Yes**  | –                                                   | Secret used to sign short-lived access tokens.                    |
| `JWT_ACCESS_TTL`                      | No       | `900s`                                              | Access token lifetime (ISO/zeit/ms format).                       |
| `JWT_REFRESH_SECRET`                  | **Yes**  | –                                                   | Secret used to sign refresh tokens.                               |
| `JWT_REFRESH_TTL`                     | No       | `7d`                                                | Refresh token lifetime.                                           |
| `GOOGLE_CLIENT_ID`                    | **Yes**  | –                                                   | Google OAuth client ID for manager login.                         |
| `GOOGLE_CLIENT_SECRET`                | **Yes**  | –                                                   | Google OAuth client secret.                                       |
| `GOOGLE_REDIRECT_URI`                 | **Yes**  | –                                                   | OAuth redirect URI registered with Google.                        |
| `OTP_PROVIDER`                        | **Yes**  | `firebase`                                          | Identifier for the chosen OTP service (default `firebase`).       |
| `OTP_DIGITS`                          | No       | `6`                                                 | Number of digits generated per OTP.                               |
| `OTP_TTL`                             | No       | `300`                                               | OTP validity window in seconds.                                   |
| `OTP_RATE_LIMIT_WINDOW`               | No       | `60`                                                | Rate limit window for OTP requests (seconds).                     |
| `OTP_RATE_LIMIT_MAX`                  | No       | `3`                                                 | Max requests per window.                                          |
| `FIREBASE_PROJECT_ID`                 | **Yes**  | –                                                   | Firebase project ID used for Phone Auth.                          |
| `FIREBASE_CLIENT_EMAIL`               | **Yes**  | –                                                   | Service account client email for Firebase Admin SDK.              |
| `FIREBASE_PRIVATE_KEY`                | **Yes**  | –                                                   | Service account private key (escape new lines as `\n`).           |
| `FIREBASE_WEB_API_KEY`                | **Yes**  | –                                                   | Web API key required for verifying ID tokens from clients.        |
| `FIREBASE_AUTH_EMULATOR_HOST`         | No       | `localhost:9099`                                    | Optional emulator host for local phone auth testing.              |
| `UPI_MODE`                            | No       | `static`                                            | UPI flow type (`static` or `dynamic`).                            |
| `UPI_VPA`                             | **Yes**  | –                                                   | Merchant VPA ID used for QR codes.                                |
| `UPI_DISPLAY_NAME`                    | No       | `Restohand Demo`                                    | Friendly merchant name on the QR.                                 |
| `UPI_CALLBACK_URL`                    | **Yes**  | –                                                   | Endpoint that receives payment status callbacks.                  |
| `CLOUD_RUN_SERVICE_URL`               | No       | `http://localhost:3000`                             | Public base URL for the backend service.                          |
| `CLOUD_STORAGE_BUCKET`                | No       | `restohand-d-bucket`                                | Bucket for generated PDFs and assets.                             |
| `CLOUD_STORAGE_BASE_URL`              | No       | `https://storage.googleapis.com/restohand-d-bucket` | Public base URL to access bucket files.                           |
| `ALLOWED_ORIGINS`                     | No       | `http://localhost:4200`                             | Comma-separated list of origins allowed by CORS.                  |
| `FRONTEND_BASE_URL`                   | No       | `http://localhost:4200`                             | Primary frontend deployment URL.                                  |

Your deployment platform should inject these variables at runtime. During local development, `nx serve @restohand/backend` reads them from `.env` via Node's `process.env`.

## Frontend Variables (`apps/frontend/.env`)

All frontend environment keys must be prefixed with `VITE_` so that Vite exposes them via `import.meta.env`.

| Key                            | Required | Default                                          | Description                                              |
| ------------------------------ | -------- | ------------------------------------------------ | -------------------------------------------------------- |
| `VITE_ENV`                     | No       | `development`                                    | Display name for the active environment.                 |
| `VITE_APP_NAME`                | No       | `Restohand`                                      | Branding shown in the shell UI.                          |
| `VITE_API_BASE_URL`            | **Yes**  | –                                                | Base URL for REST requests (should include `/api`).      |
| `VITE_WS_BASE_URL`             | **Yes**  | –                                                | Base URL for WebSocket connections.                      |
| `VITE_GOOGLE_CLIENT_ID`        | No       | –                                                | Google OAuth client ID used for frontend PKCE flows.     |
| `VITE_UPI_MODE`                | No       | `static`                                         | Mirrors backend UPI mode for UI logic.                   |
| `VITE_ANALYTICS_ENABLED`       | No       | `false`                                          | Toggles optional analytics hooks.                        |
| `VITE_BILL_DOWNLOAD_URL`       | No       | `http://localhost:3000/api/orders/:orderId/bill` | Template URL for bill downloads.                         |
| `VITE_FIREBASE_API_KEY`        | **Yes**  | –                                                | Firebase Web API key for phone auth.                     |
| `VITE_FIREBASE_AUTH_DOMAIN`    | **Yes**  | –                                                | Firebase auth domain (e.g. `<project>.firebaseapp.com`). |
| `VITE_FIREBASE_PROJECT_ID`     | **Yes**  | –                                                | Firebase project ID.                                     |
| `VITE_FIREBASE_APP_ID`         | **Yes**  | –                                                | Firebase web app ID.                                     |
| `VITE_FIREBASE_MEASUREMENT_ID` | No       | –                                                | Measurement ID if analytics is enabled.                  |

Access the variables through the helper exported from `apps/frontend/src/config/env.ts`.

```ts
import { env } from '../config/env';

console.log('Using API base URL', env.apiBaseUrl);
```

## Next Steps

- Integrate these variables with the upcoming database, auth, and payment modules.
- Configure secrets for staging/production in GCP (Secret Manager for Cloud Run, environment config for Firebase Hosting).
- Extend this document as new services or third-party integrations are introduced.
- Bring a Firebase ID token in `Authorization: Bearer <token>` for all protected management APIs. Custom claims (`roles`, `restaurantId`) control access to manager, chef, waiter, or cashier functionality.
