#!/usr/bin/env bash
# Fetches weather data from wttr.in (no API key required).
#
# Usage: weather.sh [location] [mode] [units]
#   location: city name, airport code, or "" to use the default (San Salvador, El Salvador)
#   mode:     quick (default) | full | json
#   units:    m = metric (default), u = imperial, "" = wttr.in default for the location

set -euo pipefail

LOCATION="${1:-San Salvador}"
MODE="${2:-quick}"
UNITS="${3:-m}"

BASE_URL="https://wttr.in/${LOCATION// /+}"
UNITS_PARAM=""
if [ -n "$UNITS" ]; then
  UNITS_PARAM="&${UNITS}"
fi

case "$MODE" in
  quick)
    curl -sS "${BASE_URL}?format=4${UNITS_PARAM}"
    ;;
  full)
    curl -sS "${BASE_URL}?${UNITS_PARAM#&}"
    ;;
  json)
    curl -sS "${BASE_URL}?format=j1${UNITS_PARAM}"
    ;;
  *)
    echo "Unknown mode: $MODE (use quick|full|json)" >&2
    exit 1
    ;;
esac
