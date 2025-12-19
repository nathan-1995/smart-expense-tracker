#!/bin/bash
# This script runs AFTER deployment to configure SSL.
#
# Permanent fix:
# - SSL vhosts are also re-generated on every nginx restart via systemd drop-in
#   (`Backend/.ebextensions/05_nginx_ssl_systemd_dropin.config`), so config updates
#   (like adding env vars) won't break HTTPS.

set -euo pipefail

echo "Starting SSL configuration..."

if command -v /usr/local/bin/fintrack_configure_ssl.sh >/dev/null 2>&1; then
  /usr/local/bin/fintrack_configure_ssl.sh
else
  echo "ERROR: /usr/local/bin/fintrack_configure_ssl.sh not found"
  exit 1
fi

echo "Restarting nginx..."
systemctl restart nginx

echo "Verifying nginx is listening on 443..."
if ! ss -ltnp | grep -q ':443'; then
  echo "ERROR: nginx is not listening on 443 after restart"
  exit 1
fi

echo "SSL configuration complete"
