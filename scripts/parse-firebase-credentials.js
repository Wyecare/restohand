#!/usr/bin/env node

/**
 * Parse Firebase service account JSON and extract environment variables
 * Usage: node scripts/parse-firebase-credentials.js path/to/service-account.json
 */

const fs = require('fs');
const path = require('path');

function parseFirebaseCredentials(filePath) {
  try {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`❌ File not found: ${fullPath}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(fullPath, 'utf8');
    const serviceAccount = JSON.parse(rawData);

    // Validate required fields
    const requiredFields = ['project_id', 'private_key', 'client_email', 'private_key_id', 'client_id'];
    const missing = requiredFields.filter(field => !serviceAccount[field]);

    if (missing.length > 0) {
      console.error(`❌ Missing required fields: ${missing.join(', ')}`);
      process.exit(1);
    }

    // Extract environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: serviceAccount.project_id,
      FIREBASE_PRIVATE_KEY: serviceAccount.private_key.replace(/\n/g, '\\n'), // Escape newlines
      FIREBASE_CLIENT_EMAIL: serviceAccount.client_email,
      FIREBASE_PRIVATE_KEY_ID: serviceAccount.private_key_id,
      FIREBASE_CLIENT_ID: serviceAccount.client_id
    };

    console.log('🔥 Firebase Environment Variables:');
    console.log('=====================================');

    // For terraform.tfvars format
    console.log('\n📝 For terraform.tfvars:');
    console.log('-------------------------');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`${key.toLowerCase()} = "${value}"`);
    });

    // For .env format
    console.log('\n📝 For .env file:');
    console.log('------------------');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`${key}="${value}"`);
    });

    // For Terraform locals
    console.log('\n📝 For Terraform locals:');
    console.log('-------------------------');
    console.log('locals {');
    console.log('  firebase_env_vars = {');
    Object.entries(envVars).forEach(([key, value]) => {
      console.log(`    ${key} = "${value}"`);
    });
    console.log('  }');
    console.log('}');

    return envVars;
  } catch (error) {
    console.error('❌ Error parsing Firebase credentials:', error.message);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Usage: node scripts/parse-firebase-credentials.js <path-to-service-account.json>');
    console.error('');
    console.error('Example:');
    console.error('  node scripts/parse-firebase-credentials.js firebase-service-account.json.backup');
    process.exit(1);
  }

  parseFirebaseCredentials(filePath);
}

module.exports = { parseFirebaseCredentials };