#!/bin/bash
# Script to update Nginx configuration for dev.digitalstudyacademy.com

NGINX_FILE="/etc/nginx/sites-available/dev.digitalstudyacademy.com"

echo "Updating Nginx configuration..."

# 1. Backup the original file
sudo cp "$NGINX_FILE" "${NGINX_FILE}.bak"

# 2. Write the new configuration
sudo cat << 'EOF' > "$NGINX_FILE"
server {
    server_name dev.digitalstudyacademy.com;

    location /api/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/lms/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/dev.digitalstudyacademy.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/dev.digitalstudyacademy.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

}
server {
    if ($host = dev.digitalstudyacademy.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot


    listen 80;
    server_name dev.digitalstudyacademy.com;
    return 404; # managed by Certbot


}
EOF

# 3. Restart Nginx
echo "Restarting Nginx..."
sudo systemctl restart nginx
echo "Nginx updated successfully!"
