# stream-toolkit

This is a loose collection of power tools for node.js streams, including helpers for improving the interface with promises.

## Install

```sh
$ npm install
$ npm run test
```

## Sources and sinks

- `sourceStream` - create a readable stream from a string or buffer

```javascript
var toolkit = require("stream-toolkit");
var source = toolkit.sourceStream("hello sailor!");
source.pipe(...);
```

- `sinkStream` - create a writable stream that fills a buffer

```javascript
var toolkit = require("stream-toolkit");
var sink = toolkit.sinkStream("hello sailor!");
stuff.pipe(sink);
sink.on("finish", function () {
  var buffer = sink.getBuffer();
  // ...
});
```

- `nullSinkStream` - a `SinkStream` that throws away data as it arrives

```javascript
var toolkit = require("stream-toolkit");
garbage.pipe(toolkit.nullSinkStream());
```

## Promise methods

`promisify` adds a few promise-based methods to a stream. These methods set one-shot event handlers when necessary. If they can avoid it (because data is already available, for example), they do. Error events are converted into rejected promises.

All of the streams provided by stream-toolkit are already promisified.

- `readPromise` - return a promise that reads data from a readable stream
    
```javascript
var toolkit = require("stream-toolkit");
toolkit.promisify(stream);
stream.readPromise(5).then(function (buffer) {
  // 'buffer' contains the 5 bytes
});
```

- `writePromise` - return a promise that data has been accepted downsteam (the "write" callback has been called)

```javascript
var toolkit = require("stream-toolkit");
toolkit.promisify(stream);
stream.writePromise(new Buffer("data")).then(function () {
  // "data" has been accepted downstream
});
```

- `endPromise` - return a promise that a readable stream has ended

```javascript
var toolkit = require("stream-toolkit");
toolkit.promisify(stream);
stream.endPromise().then(function () {
  // stream is ended
});
```

- `finishPromise` - return a promise that a writable stream has finished

```javascript
var toolkit = require("stream-toolkit");
toolkit.promisify(stream);
stream.finishPromise().then(function () {
  // stream is finished
});
```

- `pipeFromBuffer` - shortcut for creating a `SourceStream`, piping it into another stream, and calling `endPromise`

```javascript
var toolkit = require("stream-toolkit");
toolkit.pipeFromBuffer("data", stream).then(function () {
  // stream has processed all of "data"
});
```

- `pipeToBuffer` - shortcut for creating a `SinkStream`, piping a stream into it, and calling `finishPromise`

```javascript
var toolkit = require("stream-toolkit");
toolkit.pipeToBuffer(stream).then(function (buffer) {
  // 'buffer' contains all of stream, and stream has ended.
});
```

## Fancy streams

- `compoundStream` - create a readable stream composed of a series of other streams

`compoundStream` takes a set of component streams and concatenates them together into one single continuous stream. The constructor takes a generator function. The function is called initially to provide the first stream; when that stream ends, the generator is called again to provide the next stream. When there are no more component streams, the generator should return `null` and the `CompoundStream` itself will end.

The generator function may return a *promise* for a stream instead of a stream. That's fine.

The generator function may be an array of streams if you don't need to generate them on the fly. 

```javascript
var toolkit = require("stream-toolkit");
var source1 = toolkit.sourceStream("hello ");
var source2 = toolkit.sourceStream("sailor");
var source3 = toolkit.sourceStream("!");
var compound = toolkit.compoundStream([ source1, source2, source3 ]);
compound.pipe(...);
```

- `limitStream` - wrap a readable stream to enforce a length limit

```javascript
var toolkit = require("stream-toolkit");
var limited = toolkit.limitStream(source, 10);
stuff.pipe(limited).pipe(...);
// only 10 bytes will emerge from the pipe
```

- `countingStream` - simple Transform that counts the bytes going through it

The stream emits "count" events when the count changes. The event contains the total byte-count so far.

```javascript
var toolkit = require("stream-toolkit");
var counter = toolkit.countingStream();
stuff.pipe(counter).pipe(...);
counter.on("count", function (byteCount) {
  // bytes so far...
});
```

## Weld

- `weld` - pipe a series of streams into each other, returning a virtual stream that represents the whole series

```javascript
var toolkit = require("stream-toolkit");
// equivalent to: source1.pipe(transform1).pipe(transform2);
var stream = toolkit.weld(source1, transform1, transform2);
// new welded stream can be treated as a transform, itself:
stuff.pipe(stream).pipe(...);
```

## License

Apache 2 (open-source) license, included in 'LICENSE.txt'.

## Authors

- @robey - Robey Pointer <robeypointer@gmail.com>
