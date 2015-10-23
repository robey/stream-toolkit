"use strict";

import Promise from "bluebird";
import { Duplex } from "stream";
import { promisify } from "./promise_wrappers";

/*
 * Readable stream composed from a series of smaller streams.
 * This is a sort of meta-transform that accepts streams on the write side,
 * and emits their contents on the read side, packed end to end.
 *
 * For example:
 *
 *     const compound = compoundStream();
 *     const source = sourceStream(new Buffer("hello"));
 *     compound.write(source);
 *     compound.end();
 *     compound.read();  // "hello"
 */
class CompoundStream extends Duplex {
  constructor() {
    super({ writableObjectMode: true });

    this._stream = null;

    this.once("prefinish", () => {
      this._queue.push(null);
      this._closed = true;
      this._drain();
    });

    this._closed = false;
    this._ready = false;
    this._queue = [];
  }

  _write(stream, encoding, callback) {
    this._stream = stream;

    stream.on("end", () => {
      this._stream = null;
      callback();
    });
    stream.on("error", error => this.emit("error", error));
    stream.on("readable", () => this._readable());
  }

  _read() {
    this._ready = true;
    this._drain();
  }

  // ----- internal

  _readable() {
    if (!this._ready || this._closed || !this._stream) return;
    const chunk = this._stream.read();
    if (!chunk) return;
    this._queue.push(chunk);
    this._drain();
  }

  _drain() {
    while (this._ready && this._queue.length > 0) {
      this._ready = this.push(this._queue.shift());
    }
    // if the consumer is still hungry for more, see if a read() will pull out any more
    if (this._ready) this._readable();
  }
}


export default function compoundStream(generator, options = {}) {
  if (!options.name) options.name = "CompoundStream";
  return promisify(new CompoundStream(generator), options);
}
