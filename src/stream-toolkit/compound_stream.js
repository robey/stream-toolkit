const Promise = require("bluebird");
const promise_wrappers = require("./promise_wrappers");
const stream = require("stream");
const util = require("util");

/*
 * Readable stream composed from a series of smaller streams.
 * Generator is a function that returns each new stream in sequence, either
 * directly or as a promise. When it returns null, the compound stream ends
 * too. (Generator may also be an array, if you have a set of streams already.)
 */
class CompoundStream extends stream.Readable {
  constructor(generator) {
    super();
    this.generator = generator;
    this.closed = false;
    this.ready = false;
    this.queue = [];
    this.stream = null;
    this._next();
  }

  _next() {
    Promise.resolve(Array.isArray(this.generator) ? this.generator.shift() : this.generator()).then((s) => {
      if (!s) return this._done();
      this.stream = s;
      s.on("readable", () => this._readable());
      s.on("end", () => this._next());
      s.on("error", (err) => this.emit("error", err));
      this._readable();
    }).catch((error) => {
      this.emit("error", err);
    });
  }

  _readable() {
    if (!this.ready || this.closed || !this.stream) return;
    const chunk = this.stream.read();
    if (!chunk) return;
    this.queue.push(chunk);
    this._drain();
  }

  // push out any data we have buffered up.
  // node uses this as the "unpause" signal. the "pause" signal is returning false from a push().
  _read(n) {
    this.ready = true;
    this._drain();
  }

  _drain() {
    while (this.ready && this.queue.length > 0) {
      this.ready = this.push(this.queue.shift());
    }
    // if the consumer is still hungry for more, see if a read() will pull out any more
    if (this.ready) this._readable();
  }

  _done() {
    this.queue.push(null);
    this.closed = true;
    this._drain();
  }
}


function compoundStream(generator) {
  return promise_wrappers.promisify(new CompoundStream(generator));
}


exports.compoundStream = compoundStream;
