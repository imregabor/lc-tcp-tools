#!/bin/bash
#
# Convenience launcher for running http server


set -e
set -o pipefail
set -u

SCRIPT_DIR=$(dirname "$0")

"$SCRIPT_DIR/node_modules/.bin/http-server" --cors -d false -p 4123 -c-1
