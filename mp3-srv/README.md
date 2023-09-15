MP3 sever utils
===============


Contents
--------

  - `convert-all-to-mp3.sh`: using `ffmpeg` convert audio from all
    `mp4`, `m4a`, `mkv` and `webm` files to mp3 into directory `./mp3`

  - `generate-index-mp3-json.py`: generate index consumed by player
    in `vis`

  - dependency to https://www.npmjs.com/package/http-server for
    serving content with CORS and byte range requests support


Getting started
---------------

`ffmpeg`, `python 3` and `node.js` are required.

```
# BASE_DIR is where lc-tcp-tools is checked out
cd <PROJECT_DIR>
npm install

# Convert media to mp3
cd <MEDIA_DIRECTORY>
<BASE_DIR>/lc-tcp-tools/mp3-srv/convert-all-to-mp3.sh

# This will be <MEDIA_DIRECTORY>/mp3
cd <MP3_DIRECTORY>

# generate index file
python <BASE_DIR>/lc-tcp-tools/mp3-srv/generate-index-mp3-json.py) > index-mp3.json

# or under cygwin use
python $(cygpath -w <BASE_DIR>/lc-tcp-tools/mp3-srv/generate-index-mp3-json.py) > index-mp3.json

# launch http server
<BASE_DIR>/lc-tcp-tools/mp3-srv/node_modules/.bin/http-server --cors -d false -p 4123 -c-1
```

When launching `node.js` based server in  `../ws-server` pass the URL of the
launched mp3 server using `--mp3srv http://<IP>:4123` or `--mp3srv http://localhost:4123`


