#!/bin/bash
# This script runs AFTER deployment to configure SSL

set -e

echo "Starting SSL configuration..."

# Only create dev SSL config if dev certificate exists
if [ -d "/etc/letsencrypt/live/api-dev.fintracker.cc" ]; then
  echo "Dev certificate found, creating dev SSL config..."
  cat > /etc/nginx/conf.d/https.conf <<'EOF'
# HTTPS server block
server {
    listen 443 ssl;
    server_name api-dev.fintracker.cc;

    ssl_certificate /etc/letsencrypt/live/api-dev.fintracker.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api-dev.fintracker.cc/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_comp_level 4;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;

    access_log /var/log/nginx/access.log;

    location / {
        proxy_pass http://docker;
        proxy_http_version 1.1;

        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    include conf.d/elasticbeanstalk/*.conf;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name api-dev.fintracker.cc;
    return 301 https://$host$request_uri;
}
EOF
  echo "Dev SSL config created successfully"
fi

# Only create prod SSL config if prod certificate exists
if [ -d "/etc/letsencrypt/live/api.fintracker.cc" ]; then
  echo "Prod certificate found, creating prod SSL config..."
  cat > /etc/nginx/conf.d/https-prod.conf <<'EOF'
# HTTPS server block for production
server {
    listen 443 ssl;
    server_name api.fintracker.cc;

    ssl_certificate /etc/letsencrypt/live/api.fintracker.cc/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.fintracker.cc/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    gzip on;
    gzip_comp_level 4;
    gzip_types text/plain text/css application/json application/x-javascript text/xml application/xml application/xml+rss text/javascript;

    access_log /var/log/nginx/access.log;

    location / {
        proxy_pass http://docker;
        proxy_http_version 1.1;

        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    include conf.d/elasticbeanstalk/*.conf;
}

# HTTP to HTTPS redirect for production
server {
    listen 80;
    server_name api.fintracker.cc;
    return 301 https://$host$request_uri;
}
EOF
  echo "Prod SSL config created successfully"
fi

# Reload nginx to apply changes
echo "Reloading nginx..."
systemctl reload nginx || true

echo "SSL configuration complete"
