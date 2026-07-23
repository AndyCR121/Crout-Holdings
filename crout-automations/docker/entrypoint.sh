#!/bin/sh
set -eu

API_URL="${API_URL:-/api}"
export API_URL

envsubst '${API_URL}' < /usr/share/nginx/html/env.template.js > /usr/share/nginx/html/env.js
