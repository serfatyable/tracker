#!/bin/bash

################################################################################
# Extract Firebase Credentials from Service Account JSON
#
# This script extracts values from your Firebase service account JSON file
# and shows you what to put in .env.production.secure.template
################################################################################

if [ $# -eq 0 ]; then
  echo "Usage: $0 <path-to-service-account.json>"
  echo ""
  echo "Example:"
  echo "  $0 ~/Downloads/tracker-prod-286876-firebase-adminsdk-fbsvc-c25ba9a648.json"
  exit 1
fi

JSON_FILE="$1"

if [ ! -f "$JSON_FILE" ]; then
  echo "❌ File not found: $JSON_FILE"
  exit 1
fi

echo "📋 Extracted Firebase Admin SDK Credentials:"
echo ""
echo "Add these to .env.production.secure.template:"
echo ""

# Extract values using jq if available, or grep/sed as fallback
if command -v jq &> /dev/null; then
  PROJECT_ID=$(jq -r '.project_id' "$JSON_FILE")
  CLIENT_EMAIL=$(jq -r '.client_email' "$JSON_FILE")
  PRIVATE_KEY=$(jq -r '.private_key' "$JSON_FILE")
else
  # Fallback: use grep/sed
  PROJECT_ID=$(grep -o '"project_id"[[:space:]]*:[[:space:]]*"[^"]*"' "$JSON_FILE" | sed 's/.*"project_id"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
  CLIENT_EMAIL=$(grep -o '"client_email"[[:space:]]*:[[:space:]]*"[^"]*"' "$JSON_FILE" | sed 's/.*"client_email"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
  # For private key, we need to extract the multi-line value
  PRIVATE_KEY=$(awk '/"private_key"/{flag=1; next} flag && /-----END/{print; flag=0} flag' "$JSON_FILE" | head -1)
  # Actually, let's use a better approach for private key
  PRIVATE_KEY=$(sed -n '/"private_key"/,/-----END PRIVATE KEY-----/p' "$JSON_FILE" | grep -v '"private_key"' | tr -d '\n' | sed 's/\\n/\n/g')
fi

echo "FIREBASE_PROD_ADMIN_PROJECT_ID=$PROJECT_ID"
echo "FIREBASE_PROD_ADMIN_CLIENT_EMAIL=$CLIENT_EMAIL"
echo ""
echo "FIREBASE_PROD_ADMIN_PRIVATE_KEY=\"$PRIVATE_KEY\""
echo ""

echo "⚠️  IMPORTANT: You still need to get Firebase Web App config:"
echo ""
echo "1. Go to: https://console.firebase.google.com/project/$PROJECT_ID/settings/general"
echo "2. Scroll to 'Your apps' section"
echo "3. Click on your web app (or create one if it doesn't exist)"
echo "4. Copy these values:"
echo "   - apiKey → FIREBASE_PROD_API_KEY"
echo "   - authDomain → FIREBASE_PROD_AUTH_DOMAIN"
echo "   - storageBucket → FIREBASE_PROD_STORAGE_BUCKET"
echo "   - appId → FIREBASE_PROD_APP_ID"
echo ""
echo "The authDomain should be: ${PROJECT_ID}.firebaseapp.com"
echo "The storageBucket should be: ${PROJECT_ID}.appspot.com or ${PROJECT_ID}.firebasestorage.app"

