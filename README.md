TCP tools
=========

This is a scratchpad for the LC project tools, heavily under construction.


Contents
--------

  - `replay-demo`: browser based visualization of capture contents
  
  - `ws-server`: node.js tool to forward TCP traffic from effects computer (or replay tool) to
    websocet based server

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



TODO
----

 - ~~More graceful handle of connection reset in `packet-dump.js` - done~~ 
