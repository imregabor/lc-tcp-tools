Replay demo
===========

This is a small visualization for packet capture contents. 


What works:
-----------

 - `webpack` based build
 - importing packet capture into JS receiving effect data over websocket connection 
 - rendering of lights (static / minimal animation)
 - performance counters, status info


Compilation
-----------

Make sure that [node.js](https://nodejs.org/en/download/) is installed.

```
cd replay-demo
npm ci
npm run build
```

After compilation open `replay-demo/dist/index.html` or launch Node server in `../ws-server`.


TODO
----

 - Flip / mirror of display
 - Manual control 
 - ~~Parse and playback imported capture~~


See also 
--------

 - `Webpack` [Getting started guide](https://webpack.js.org/guides/getting-started/)
 - <https://webpack.js.org/concepts/loaders/>
 - <https://github.com/npm/npm/issues/3710>
 - <https://gka.github.io/chroma.js/#chroma-scale>
