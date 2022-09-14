TCP tools
=========

This is a scratchpad for the LC project tools, heavily under construction.


Contents
--------

  - `packet-dump.js`: node.js tool to capture TCP traffic from effects computer with timestamps
  - `data/capture-ppp.txt.gz`: direct timestamped capture of TCP traffic from the effects computer
    from https://www.youtube.com/watch?v=JbspWYbuxgE ("Pixel Peeker Polka - faster" by Kevin MacLeod)
  - `data/capture-rfd.txt.gz`: direct timestamped capture of TCP traffic from the effects computer
    from https://www.youtube.com/watch?v=WV8AcJU-_yU ("RetroFuture Dirty" by Kevin MacLeod). Note that
    the song played multiple times.


TODO
----

 - More graceful handle of connection reset in `packet-dump.js`, see

```
$ node packet-dump.js > capture.txt
node:events:491
      throw er; // Unhandled 'error' event
      ^

Error: read ECONNRESET
    at TCP.onStreamRead (node:internal/stream_base_commons:217:20)
Emitted 'error' event on Socket instance at:
    at emitErrorNT (node:internal/streams/destroy:157:8)
    at emitErrorCloseNT (node:internal/streams/destroy:122:3)
    at processTicksAndRejections (node:internal/process/task_queues:83:21) {
  errno: -4077,
  code: 'ECONNRESET',
  syscall: 'read'
}
```
