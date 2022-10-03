REST/WS/TCP server
==================

This is a `node.js` based server, primarily for the HTML based visualization in `../replay-demo/`. Functionalities:

 - Listening TCP server for raw effect data. Connect from effect computer of from `../replay-packet-dump.js`
 - Listening REST API for sending individual packets, packet groups, querying status
 - Forwarding TCP client to drive lighting hardware. Data received on listening TCP server forwarded. Individual packets/packet groups from REST API also forwarded here.
 - Listening WS server forwarding packets received from listening server of injected by REST API
 - LIstening HTTP server for static content of `../replay-demo`

Getting started
---------------


Make sure that node.js is installed. Make sure `../replay-demo` project is compiled.

```
cd ws-server
npm ci
node index.js
```

Open <http://localhost:3000/>.

