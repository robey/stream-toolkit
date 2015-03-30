const promise_wrappers = require("./promise_wrappers");
const stream = require("stream");
const util = require("util");

// Readable stream that wraps another, with a size limit.
class LimitStream extends stream.Readable {
  constructor(stream, size) {
    super();
    this.stream = stream;
    this.size = size;
    this.ready = false;
    this.queue = [];
    this.handlers = {
      readable: () => this._readable(),
      end: () => this._end(),
      error: (error) => this.emit("error", error)
    };
    for (let k in this.handlers) this.stream.on(k, this.handlers[k]);
  }

  _readable() {
    if (!this.ready) return;
    if (this.size == 0) return this._end();
    let chunk = this.stream.read();
    if (chunk == null) return;
    let overage = null;
    if (chunk.length > this.size) {
      // don't unshift yet: node will just recursively trigger _readable.
      overage = chunk.slice(this.size);
      chunk = chunk.slice(0, this.size);
    }
    this.size -= chunk.length;
    this.queue.push(chunk);
    if (this.size == 0) this.queue.push(null);
    // okay to unshift now: if we had overage, size is 0 and our _readable callback will return immediately.
    if (overage != null) this.stream.unshift(overage);
    // send immediately to the consumer if they're waiting
    this._drain();
  }

  _end() {
    // stop tracking the input stream
    for (let k in this.handlers) this.stream.removeListener(k, this.handlers[k]);
    this.queue.push(null);
    this._drain();
  }

  // push out any data we have buffered up.
  // node uses this as the "unpause" signal. the "pause" signal is returning false from a push() call.
  _read(n) {
    this.ready = true;
    this._drain();
  }

  _drain() {
    while (this.ready && this.queue.length > 0) {
      this.ready = this.push(this.queue.shift());
    }
    // if the consumer is still hungry for more, see if a read() will pull out any more.
    if (this.ready) this._readable();
  }

  // returns true if the size limit has been reached.
  // this can be used to verify that all bytes were read if the stream ends.
  isFinished() {
    return this.size == 0;
  }

  toString() {
    return `LimitStream(ready=${this.ready}, queue=${util.inspect(this.queue)}, size=${this.size}, stream=${this.stream.toString()})`;
  }
}


function limitStream(stream, size) {
  return promise_wrappers.promisify(new LimitStream(stream, size));
}


exports.limitStream = limitStream;
