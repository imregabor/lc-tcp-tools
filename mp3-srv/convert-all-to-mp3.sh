#!/bin/bash
#
# Convert all mp4 / mkv / webm / m4a videos to mp3, preserving directory structure and basenames under ./mp3/
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


mkdir -p "${MP3BASEDIR}"

while read line ; do
  MP3=$(echo "./mp3/${line}" | sed -e 's/mp4$/mp3/' | sed -e 's/mkv$/mp3/' | sed -e 's/webm$/mp3/' | sed -e 's/m4a$/mp3/')
  echo
  echo
  echo "Checking ${line}"
  echo "  mp3 file: ${MP3}"
  if [ -f "$MP3" ] ; then
    echo "  found."
  else
    echo "  not found, converting (or copying)"
    PARENT=$(readlink -m "${MP3}/..")
    EXT=$(echo "${line}" | sed -e 's/^.*\.//')
    if [ "${EXT}" == "mkv" ] ; then EXT="matroska" ; fi
    TMPFILE="./tmp.${EXT}"

    echo "  PARENT:  ${PARENT}"
    echo "  EXT:     ${EXT}"
    echo "  TMPFILE: ${TMPFILE}"

    mkdir -p "${PARENT}"


    if [ "${EXT}" == "mp3" ] ; then
      echo "  Direct copy mp3 file"
      cp "${line}" "${MP3}"
    else
      echo "  Copy to tmp then launch ffmpeg conversion"

      # https://superuser.com/questions/332347/how-can-i-convert-mp4-video-to-mp3-audio-with-ffmpeg
      # https://stackoverflow.com/questions/45899585/pipe-input-in-to-ffmpeg-stdin
      # https://forums.gentoo.org/viewtopic-p-8732324.html?sid=2af132bee11d7a83dc004a8a4ad0e5e5
      # avoid pipe input
      cp "${line}" "${TMPFILE}"
      # https://unix.stackexchange.com/questions/36310/strange-errors-when-using-ffmpeg-in-a-loop
      # http://mywiki.wooledge.org/BashFAQ/089

      ffmpeg  -f "${EXT}" -i "${TMPFILE}" -b:a 320K -vn -f mp3 pipe: > "${MP3}" < /dev/null
      rm "${TMPFILE}"
      echo "  DONE"
    fi

    echo
    echo
    echo

  fi
  echo

done < <(find -type f -wholename '*.mp4' -o -wholename '*.mkv' -o -wholename '*.webm' -o -wholename '*.mp3' -o -wholename '*.m4a' | grep -v '^./mp3')
