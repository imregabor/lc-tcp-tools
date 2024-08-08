#!/bin/bash
#
# Remove mp3s from mp3/ which has no corresponding source
#
# Using ffmpeg for conversion; this script works with
# cygwin and handles weird file names containing unicode
# characters and whitespaces correctly.

set -e
set -o pipefail
set -u

# see http://stackoverflow.com/questions/592620/check-if-a-program-exists-from-a-bash-script
for i in ffmpeg
do
    echo "Checking command $i"
    command -v $i >/dev/null 2>&1 || { echo >&2 "$i not found"; exit 1; }
done


MP3BASEDIR=$(readlink -m `pwd`)"/mp3"

echo "MP3BASEDIR: ${MP3BASEDIR}"

ALLCT=0
FOUNDCT=0
ORPHANCT=0


while read line ; do
  ALLCT=$(( $ALLCT + 1 ))
  SRC=$(echo "${line}" | sed -e 's#^./mp3/#./#' | sed -e 's#mp3$##')
  echo -n "Checking # ${ALLCT}: ${line}"
  if ls "${SRC}"* &>/dev/null ; then
    FOUNDCT=$(( $FOUNDCT + 1 ))
    echo " -> found (so far src found: ${FOUNDCT}, orphan: ${ORPHANCT})"
  else
    ORPHANCT=$(( $ORPHANCT + 1 ))
    echo "  -> source missing, delete"
    rm "$line"
  fi
done < <(find -type f -wholename './mp3/*.mp3*')


echo
echo
echo
echo "All done."
echo "  Total files checked: ${ALLCT}"
echo "  Found (skipped):     ${FOUNDCT}"
echo "  Orphans (deleted):   ${ORPHANCT}"
echo
echo
