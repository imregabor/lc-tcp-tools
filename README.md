TCP tools
=========

This is a scratchpad for the LC project tools, heavily under construction.


Contents
--------

  - `ws-server/`: `node.js` server for forwarding TCP traffic from effects computer (or replay tool) to
    websocet based server, serving `replay-demo` and `vis` compiled pages, 

  - `replay-demo/`: browser based visualization of captured state from `ws-server` with limited
    manual interactions

  - `vis/`: browser based real time effects using Web Audio. Data is forwarded to `ws-server`
    for routing to the hardvare or for browser based display

  - `packet-dump.js`: node.js tool to capture TCP traffic from effects computer with timestamps
  
  - `replay-packet-dump.js`: node.js to replay captured TCP traffic from `stdin` over a TCP/IP
    connection using timing timestamps

  - `data/capture-ppp.txt.gz`: direct timestamped capture of TCP traffic from the effects computer
    from ["Pixel Peeker Polka - faster"](https://www.youtube.com/watch?v=JbspWYbuxgE) by Kevin MacLeod.

  - `data/ppp.pcapng.gz`: Wireshark capture of communication between the effects computer and
    TCP/EPP bridge during playback of above song ("Pixel Peeker Polka"). Note that this capture
    created during a run different from above.

  - `data/capture-rfd.txt.gz`: direct timestamped capture of TCP traffic from the effects computer
    from ["RetroFuture Dirty"](https://www.youtube.com/watch?v=WV8AcJU-_yU) by Kevin MacLeod. Note that
    the song played multiple times.

Getting started
---------------

 - Compile `replay-demo/` (see <replay-demo/readme.md>)
 - Compile `vis/` (see <vis/readme.md>)
 - Launch `ws-server` see [ws-server/readme.md](`ws-server/readme.md`))
 - Point browser to <http://localhost:3000>

TODO
----
 - Use Math expressions in `vis/readme.md`, see
   https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/writing-mathematical-expressions
 - Handle multiple WS connection from Node side
 - Check if WS connection is still alive
 - ~~Linear arrays:~~

   - BUS6, ADDR 40 (0x28): road side group, inner (left when viewing from front of)
   - BUS6, ADDR 47 (0x2f): road side group, outermost (right when viewing from front of)

   - BUS7, ADDR 32 (0x28): thuja side (left when viewing from front of)
   - BUS7, ADDR 39 (0x2f): road side (right when viewing from front of)

   - BUS4, ADDR 32 (0x20): thuja side group, outermost (left when viewing from front of)
   - BUS4, ADDR 39 (0x27): thuja side group, innermost (right when viewing from front of)

 - ~~7 x 5 matrix: string directions switched (page displays correctly)~~

 - ~~More graceful handle of connection reset in `packet-dump.js`~~ - done
