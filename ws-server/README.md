REST/WS/TCP server
==================

Introduction
------------

This is a `node.js` based server, for the HTML based visualization and for routing scheduled and music
dependent effects to legacy hardware:


### Routing

  - Listening TCP server for raw effect data. Connect from effect computer of from `../replay-packet-dump.js`.
  - Forwarding TCP client to drive lighting hardware. Data received on listening TCP server forwarded. Individual
    packets/packet groups from REST API also forwarded here.
  - Listening REST API for sending individual packets, packet groups, querying status, initiating
    scheduled effects
  - Listening WS server forwarding packets received from listening server of injected by REST API or scheduled
    effects

### Static content

 - Listening HTTP server for static content of `../replay-demo/dist/` for 2D/3D visualisation
   of effects state and to initiate scheduled effects
 - Listening HTTP server for static content of `../vis/dist/` for real-time audio dependent effects

Getting started
---------------


Make sure that node.js is installed. Make sure `../replay-demo` and `../vis` projects are compiled.

```
cd ws-server
npm ci

# no mp3 server available
node index.js

# see ../mp3-srv/README.md
node index.js --mp3srv http://XXX.XXX.XXX.XXX:4123

# or
node index.js --mp3srv http://localhost:4123
```

Open <http://localhost:3000/>.

