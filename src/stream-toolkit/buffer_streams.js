const promise_wrappers = require("./promise_wrappers");
const stream = require("stream");

// simple writable stream that collects all incoming data and provides it in a single (combined) buffer.
class SinkStream extends stream.Writable {
  constructor(options = {}) {
    super(options);
    this.buffers = [];
  }

  _write(chunk, encoding, callback) {
    this.buffers.push(chunk);
    callback();
  }

  // combine all received data into a buffer and return it. may be called multiple times.
  getBuffer() {
    return Buffer.concat(this.buffers);
  }

  // clear all received data so far.
  reset() {
    this.buffers = [];
  }
}


// writable stream that drains a readable by throwing away all the data.
class NullSinkStream extends stream.Writable {
  constructor(options = {}) {
    super(options);
  }

  _write(chunk, encoding, callback) {
    callback();
  }
}


// feed a readable stream from a single buffer.
class SourceStream extends stream.Readable {
  constructor(buffer, options = {}) {
    super(options);
    this.buffer = buffer;
  }

  _read(size) {
    this.push(this.buffer);
    this.push(null);
  }
}


function sinkStream(options) {
  return promise_wrappers.promisify(new SinkStream(options));
}

function nullSinkStream(options) {
  return promise_wrappers.promisify(new NullSinkStream(options));
}

function sourceStream(buffer, options) {
  return promise_wrappers.promisify(new SourceStream(buffer, options));
}

// shortcut for creating a SourceStream and piping it to a writable.
function pipeFromBuffer(buffer, writable, options) {
  const source = sourceStream(buffer);
  source.pipe(writable, options);
  return source.endPromise();
}

// shortcut for creating a SinkStream and piping a readable into it.
function pipeToBuffer(readable, options) {
  const sink = sinkStream();
  readable.pipe(sink, options);
  return sink.finishPromise().then(() => sink.getBuffer());
}


exports.nullSinkStream = nullSinkStream;
exports.pipeFromBuffer = pipeFromBuffer;
exports.pipeToBuffer = pipeToBuffer;
exports.sinkStream = sinkStream;
exports.sourceStream = sourceStream;
