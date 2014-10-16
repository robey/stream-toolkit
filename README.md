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

## Promise wrappers

The promise wrappers set one-shot event handlers when necessary. If they can avoid it (because data is already available, for example), they do. Error events are converted into failing promises.

- `qread` - return a promise that reads data from a readable stream
    
```javascript
var toolkit = require("stream-toolkit");
toolkit.qread(stream, 5).then(function (buffer) {
  // 'buffer' contains the 5 bytes
});
```

- `qwrite` - return a promise that data has been accepted downsteam (the "write" callback has been called)

```javascript
var toolkit = require("stream-toolkit");
toolkit.qwrite(stream, new Buffer("data")).then(function () {
  // "data" has been accepted downstream
});
```

- `qend` - return a promise that a readable stream has ended

```javascript
var toolkit = require("stream-toolkit");
toolkit.qend(stream).then(function () {
  // stream is ended
});
```

- `qfinish` - return a promise that a writable stream has finished

```javascript
var toolkit = require("stream-toolkit");
toolkit.qfinish(stream).then(function () {
  // stream is finished
});
```

- `pipeFromBuffer` - shortcut for creating a `SourceStream`, piping it into another stream, and calling `qend`

```javascript
var toolkit = require("stream-toolkit");
toolkit.pipeFromBuffer("data", stream).then(function () {
  // stream has processed all of "data"
});
```

- `pipeToBuffer` - shortcut for creating a `SinkStream`, piping a stream into it, and calling `qfinish`

```javascript
var toolkit = require("stream-toolkit");
toolkit.pipeToBuffer(stream).then(function (buffer) {
  // 'buffer' contains all of stream, and stream has ended.
});
```

## Fancy streams



exports.CompoundStream = compound_stream.CompoundStream

exports.CountingStream = counting_stream.CountingStream

exports.LimitStream = limit_stream.LimitStream


exports.weld = weld.weld

