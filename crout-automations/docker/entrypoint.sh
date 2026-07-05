#!/bin/sh
set -eu

: "${API_URL:?API_URL must be set}"

envsubst '${API_URL}' < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
