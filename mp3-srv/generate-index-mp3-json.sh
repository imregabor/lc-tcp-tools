#!/bin/bash
#
# Convenience launcher supporting cygwin + python on windows


set -e
set -o pipefail
set -u

# see http://stackoverflow.com/questions/592620/check-if-a-program-exists-from-a-bash-script
for i in python
do
    echo "Checking command $i"
    command -v $i >/dev/null 2>&1 || { echo >&2 "$i not found"; exit 1; }
done


SCRIPT_DIR=$(dirname "$0")

if [[ `uname` =~ CYGWIN ]] ; then
  SCRIPT_DIR=$(cygpath -w "$SCRIPT_DIR")
fi

PY_SCRIPT_NAME=$(basename "$0" .sh)".py"

echo "Script dir:     ${SCRIPT_DIR}"
echo "Py script name: ${PY_SCRIPT_NAME}"

python "${SCRIPT_DIR}/${PY_SCRIPT_NAME}" > index-mp3.json

