# stream-toolkit

This is a loose collection of power tools for node.js streams, including helpers for improving the interface with promises.

## Sources and sinks

- `SourceStream` - create a readable stream from a string or buffer

```javascript
var toolkit = require("stream-toolkit");
var source = new toolkit.SourceStream("hello sailor!");
source.pipe(...);
```

- `SinkStream` - create a writable stream that fills a buffer

```javascript
var toolkit = require("stream-toolkit");
var sink = new toolkit.SinkStream("hello sailor!");
stuff.pipe(sink);
sink.on("finish", function () {
  var buffer = sink.getBuffer();
  // ...
});
```

- `NullSinkStream` - a `SinkStream` that throws away data as it arrives

```javascript
var toolkit = require("stream-toolkit");
garbage.pipe(new toolkit.NullSinkStream());
```

    





exports.CompoundStream = compound_stream.CompoundStream

exports.CountingStream = counting_stream.CountingStream

exports.LimitStream = limit_stream.LimitStream

exports.pipeFromBuffer = q_wrappers.pipeFromBuffer
exports.pipeToBuffer = q_wrappers.pipeToBuffer
exports.qend = q_wrappers.qend
exports.qfinish = q_wrappers.qfinish
exports.qread = q_wrappers.qread
exports.qwrite = q_wrappers.qwrite

exports.weld = weld.weld

