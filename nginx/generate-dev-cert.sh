#!/bin/bash
# Generates a self-signed TLS cert for local development.
# Run once from the repo root: bash nginx/generate-dev-cert.sh
set -e

mkdir -p nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem \
  -out nginx/ssl/fullchain.pem \
  -subj "/C=US/ST=Dev/L=Dev/O=DevSync/CN=localhost"

echo "Dev SSL cert generated at nginx/ssl/ (valid 365 days)"
echo "Start nginx with: docker compose up nginx"
