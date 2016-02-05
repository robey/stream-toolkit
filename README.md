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
  - `setDebugLogger`
- [Transforms](#transforms)
  - `bufferStream`
  - `compoundStream`

  compoundStream,
  countingStream,
  limitStream,
  setDebugLogger,
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

### sinkStream(options = {})

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
  - `getBuffer(): Buffer`

### nullSinkStream(options = {})

Create a `SinkStream` that throws away data as it arrives, instead of buffering it.

```javascript
import { nullSinkStream } from "stream-toolkit";
garbage.pipe(nullSinkStream());
```


## Promise methods

`promisify` adds a few promise-based methods to a stream. These methods set one-shot event handlers when necessary. If they can avoid it (because data is already available, for example), they do. Error events are converted into rejected promises.

All of the streams provided by stream-toolkit are already promisified.

### readPromise(length)

Return a promise for `read(length)`. The promise will either resolve with exactly the requested number of bytes, or reject on error.

```javascript
import { promisify } from "stream-toolkit";
promisify(stream);
stream.readPromise(5).then(buffer => {
  // 'buffer' contains the 5 bytes
});
```

### writePromise(buffer)

Return a promise for `write(buffer)`. The promise will resolve once data has been accepted downsteam (the "write" callback has been called), or reject on error.

```javascript
import { promisify } from "stream-toolkit";
promisify(stream);
stream.writePromise(new Buffer("data")).then(() => {
  // "data" has been accepted downstream
});
```

### endPromise()

Return a promise that a readable stream has ended. If the stream has already ended, it will resolve immediately. Otherwise, it will resolve when the "end" event is received.

```javascript
import { promisify } from "stream-toolkit";
promisify(stream);
stream.endPromise().then(() => {
  // stream is ended
});
```

### finishPromise()

Return a promise that a writable stream has finished. If the stream has already finished, it will resolve immediately. Otherwise, it will resolve when the "finish" event is received.

```javascript
import { promisify } from "stream-toolkit";
promisify(stream);
stream.finishPromise().then(() => {
  // stream is finished
});
```

### pipeFromBuffer(buffer, writable, options = {})

Create a `SourceStream` from a buffer, pipe that into a writable stream, and return `endPromise()` on the source.

```javascript
import { pipeFromBuffer } from "stream-toolkit";
pipeFromBuffer("data", stream).then(() => {
  // stream has processed all of "data"
});
```

### pipeToBuffer(readable, options = {})

Create a `SinkStream`, pipe a readable stream into it, and return a promise for the sink buffer. The promise resolves after the readable is completely drained.

```javascript
import { pipeToBuffer } from "stream-toolkit";
pipeToBuffer(stream).then(buffer => {
  // 'buffer' contains all of stream, and stream has ended.
});
```

### setDebugLogger(logger)

Set a log function for recording detailed traces of buffers moving through promisified streams. This can be useful when debugging thorny stream synchronization problems, to see exactly where the data goes (or gets lost).

The logger must be a function that takes a string argument: the text to be logged.

```javascript
import { setDebugLogger } from "stream-toolkit";
setDebugLogger(text => console.log(text));
```


## Transforms

### bufferStream(options = {})

Buffer incoming data until it reaches a desired block size, then pass it downstream. If `exact` is set, downstream writes will be _exactly_ the desired block size until the stream ends. In either case, when a stream ends, the final write may contain a "short" block if there isn't enough data left.

Options:
  - `blockSize`: how many bytes to buffer (default: 1048576, or 1MB)
  - `exact`: (boolean) never send more than `blockSize` at a time

```javascript
import { bufferStream } from "stream-toolkit";
const counter = new stream.Transform({
  transform: (buffer, _, callback) => {
    console.log(buffer.length);
    callback();
  }
});
const buffering = bufferStream({ blockSize: 1024, exact: true });
fs.createReadStream("README.md").pipe(buffering).pipe(counter);
// 1024, 1024, 1024, ..., 811
```

### compoundStream(options = {})

Create a Readable stream composed from a series of smaller streams. This is a sort of meta-transform that accepts streams on the input (write side), and emits their contents as a single stream, packed end to end, on the output (read side). Any options are passed to `promisify`.

That is, you write stream objects into it, and their contents come out the other side as buffers.

```javascript
import { compoundStream } from "stream-toolkit";
const compound = compoundStream();
const source = sourceStream(new Buffer("hello"));
compound.write(source);
compound.end();
compound.read();  // "hello"
```




## Fancy streams


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
