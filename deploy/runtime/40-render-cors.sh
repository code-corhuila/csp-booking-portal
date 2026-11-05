#!/bin/sh
# Renders the CORS rule from the container environment, so the same image is promoted
# from one environment to the next (ADR-026). The shell loads this portal from another
# origin: without the rule the browser blocks remoteEntry.json and every module.
set -eu

if [ -z "${CORS_ALLOWED_ORIGIN_REGEX:-}" ]; then
  echo "csp-booking-portal: missing required environment variable: CORS_ALLOWED_ORIGIN_REGEX" >&2
  exit 1
fi

# An unanchored value would also match longer origins (http://localhost:4200.evil.example), because
# "~" in an nginx map matches a substring.
case "$CORS_ALLOWED_ORIGIN_REGEX" in
  '^'*'$') ;;
  *)
    echo "csp-booking-portal: CORS_ALLOWED_ORIGIN_REGEX must start with ^ and end with \$ (ADR-026)" >&2
    exit 1
    ;;
esac

envsubst '${CORS_ALLOWED_ORIGIN_REGEX}' < /opt/csp-runtime/cors-origin.conf.template > /etc/nginx/conf.d/cors-origin.conf
echo "csp-booking-portal: CORS rule rendered"
