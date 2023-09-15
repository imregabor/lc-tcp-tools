#!/usr/bin/env python3

import os
import urllib.parse
import json
import pprint
import sys

from os.path import join, getsize


mp3infos = []
ret = {
  'mp3s' : mp3infos
}

mp3ct = 0
for root, dirs, files in os.walk('.'):
  sys.stderr.write(f'Traversing {root}, containing {len(files)} files\n')
  for file in files:
    if not file.endswith('.mp3'):
      continue

    mp3ct += 1

    p = os.path.join(root, file)
    size = os.path.getsize(p);
    pstr = str(p)[2:]

    if os.sep == '\\':
      pstr = pstr.replace('\\', '/')

    dirs = pstr.split('/')

    purl = urllib.parse.quote(pstr)


    mp3infos.append({
      'filename' : file,
      'url' : purl,
      'dirs' : dirs[:-1]
    })

sys.stderr.write(f'All done, found {mp3ct} mp3 files\n')

print(json.dumps(ret))



