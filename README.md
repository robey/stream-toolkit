# stream-toolkit

This is a loose collection of power tools for node.js streams, including helpers for improving the interface with promises.

## Install

```sh
$ npm install
$ npm test
```

## API Contents

- [Sources and sinks](#sources-and-sinks)
  - `sourceStream`
  - `sinkStream`
  - `nullSinkStream`
- [Promise methods](#promise-methods)
  - `promisify`
    - `readPromise`
    - `writePromise`
    - `endPromise`
    - `finishPromise`
    - `pipeFromBuffer`
    - `pipeToBuffer`

  bufferStream,
  compoundStream,
  countingStream,
  limitStream,
  PullTransform,
  setDebugLogger,
  Transform,
  weld

- [Building blocks]
  - `Transform`
  - `PullTransform`


## Sources and sinks

### sourceStream(buffer, options = {})

Create a readable stream from a string or buffer. Options are passed to the underlying `Readable`.

```javascript
import { sourceStream } from "stream-toolkit";
const source = sourceStream("hello sailor!");
source.pipe(...);
```

### `sinkStream(options = {})`

Create a writable stream that fills a buffer. Options are passed to the underlying `Writable`.

```javascript
import { sinkStream } from "stream-toolkit";
const sink = sinkStream("hello sailor!");
stuff.pipe(sink);
sink.on("finish", () => {
  const buffer = sink.getBuffer();
  // ...
});
```

The returned stream has one extra method for fetching the buffered contents:
  - `getBuffer()`

- `nullSinkStream` - Create a `SinkStream` that throws away data as it arrives, instead of buffering it.

  ```javascript
  import { nullSinkStream } from "stream-toolkit";
  garbage.pipe(nullSinkStream());
  ```

## Promise methods

`promisify` adds a few promise-based methods to a stream. These methods set one-shot event handlers when necessary. If they can avoid it (because data is already available, for example), they do. Error events are converted into rejected promises.

All of the streams provided by stream-toolkit are already promisified.

- `readPromise(length)` - Return a promise for `read(length)`. The promise will either resolve with exactly the requested number of bytes, or reject on error.

  ```javascript
  import { promisify } from "stream-toolkit";
  promisify(stream);
  stream.readPromise(5).then(buffer => {
    // 'buffer' contains the 5 bytes
  });
  ```

- `writePromise(buffer)` - Return a promise for `write(buffer)`. The promise will resolve once data has been accepted downsteam (the "write" callback has been called), or reject on error.

  ```javascript
  import { promisify } from "stream-toolkit";
  promisify(stream);
  stream.writePromise(new Buffer("data")).then(() => {
    // "data" has been accepted downstream
  });
  ```

- `endPromise()` - Return a promise that a readable stream has ended. If the stream has already ended, it will resolve immediately. Otherwise, it will resolve when the "end" event is received.

  ```javascript
  import { promisify } from "stream-toolkit";
  promisify(stream);
  stream.endPromise().then(() => {
    // stream is ended
  });
  ```

- `finishPromise()` - Return a promise that a writable stream has finished. If the stream has already finished, it will resolve immediately. Otherwise, it will resolve when the "finish" event is received.

  ```javascript
  import { promisify } from "stream-toolkit";
  promisify(stream);
  stream.finishPromise().then(() => {
    // stream is finished
  });
  ```

- `pipeFromBuffer(buffer, writable, options = {})` - Create a `SourceStream` from a buffer, pipe that into a writable stream, and return `endPromise()` on the source.

  ```javascript
  import { pipeFromBuffer } from "stream-toolkit";
  pipeFromBuffer("data", stream).then(() => {
    // stream has processed all of "data"
  });
  ```

- `pipeToBuffer(readable, options = {})` - Create a `SinkStream`, pipe a readable stream into it, and return a promise for the sink buffer. The promise resolves after the readable is completely drained.

  ```javascript
  import { pipeToBuffer } from "stream-toolkit";
  toolkit.pipeToBuffer(stream).then(buffer => {
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

## Debugging

Set a debug logger function to receive detailed debugging info about stream processing and events. For example:

```javascript
toolkit.setDebugLogger(console.log);
```

The function will receive one argument: a string to log.

## License

Apache 2 (open-source) license, included in 'LICENSE.txt'.

## Authors

- @robey - Robey Pointer <robeypointer@gmail.com>
