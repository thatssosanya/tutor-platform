#!/bin/sh

# This script automates fetching the missing intermediate certificate
# for ege.fipi.ru, which is misconfigured and doesn't send the full trust chain.
# It then updates the ./.env file with this certificate in the correct format.

# Exit immediately if any command fails
set -e

# --- Configuration ---
HOST="ege.fipi.ru"
PORT="443"
ENV_VAR_NAME="FIPI_INTERMEDIATE_CERT"
ENV_FILE="./.env"
# ---------------------

echo "Starting FIPI certificate update for $HOST..."

# 1. Connect to the server, get its leaf cert, parse it to find the "CA Issuers" URL.
#    This URL points to the intermediate certificate we need.
echo "Fetching certificate from $HOST to find its issuer..."
CERT_URL=$(openssl s_client -connect ${HOST}:${PORT} 2>/dev/null </dev/null | \
  openssl x509 -text -noout | \
  grep -A 1 "Authority Information Access" | \
  grep "CA Issuers" | \
  sed 's/.*CA Issuers - URI:\(.*\)/\1/')

if [ -z "$CERT_URL" ]; then
  echo "Error: Could not find 'CA Issuers - URI' in the certificate."
  echo "The server's certificate may have changed. Please check manually."
  exit 1
fi

echo "Found intermediate certificate URL: $CERT_URL"

# 2. Download that certificate. It's in binary DER format.
#    Pipe it directly to openssl to convert it from DER to text PEM format.
echo "Downloading and converting intermediate certificate from DER to PEM..."
CERT_PEM=$(curl -sL "$CERT_URL" | openssl x509 -inform DER -outform PEM)

if [ -z "$CERT_PEM" ]; then
  echo "Error: Failed to download or convert the certificate."
  exit 1
fi

# 3. Convert the multi-line PEM text into a single line with literal '\n' characters,
#    suitable for an environment variable.
echo "Formatting certificate for .env file..."
ENV_VALUE=$(echo "$CERT_PEM" | awk '{printf "%s\\n", $0}')

# 4. Create the final line to be written to the .env file.
FINAL_LINE="${ENV_VAR_NAME}=\"${ENV_VALUE}\""

# 5. Ensure the .env file exists so we can write to it.
touch "$ENV_FILE"

# 6. Remove any existing line for this variable from .env.
#    This uses a portable sed command that works on both Linux (GNU) and macOS (BSD).
#    It creates a backup file (.env.bak) and then immediately deletes it on success.
echo "Removing old $ENV_VAR_NAME from $ENV_FILE (if it exists)..."
sed -i.bak "/^${ENV_VAR_NAME}=/d" "$ENV_FILE" && rm "${ENV_FILE}.bak"

# 7. Append the new, complete line to the end of the .env file.
echo "Appending new $ENV_VAR_NAME to $ENV_FILE..."
echo "$FINAL_LINE" >> "$ENV_FILE"
echo "$FINAL_LINE"

echo "✅ Success! FIPI Intermediate Certificate has been updated in $ENV_FILE."