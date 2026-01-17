#!/bin/bash

# Script to migrate from Firebase authentication to JWT authentication

echo "Starting migration from Firebase to JWT authentication..."

# Find all TypeScript files in the backend that import FirebaseAuthGuard
find apps/backend/src -name "*.ts" -type f | xargs grep -l "FirebaseAuthGuard" | while read file; do
    echo "Updating $file..."

    # Replace FirebaseAuthGuard imports
    sed -i '' 's/FirebaseAuthGuard/JwtAuthGuard/g' "$file"

    # Replace import paths
    sed -i '' 's|../auth/guards/firebase-auth\.guard|../auth/guards/jwt-auth.guard|g' "$file"
    sed -i '' 's|\.\.\/auth\/guards\/firebase-auth\.guard|../auth/guards/jwt-auth.guard|g' "$file"
    sed -i '' 's|from.*firebase-auth\.guard.*|from "../auth/guards/jwt-auth.guard";|g' "$file"

    echo "Updated $file"
done

echo "Migration complete! Please verify the changes manually."
echo "Remember to:"
echo "1. Test the authentication endpoints"
echo "2. Update the frontend to use the new endpoints"
echo "3. Remove Firebase dependencies when ready"