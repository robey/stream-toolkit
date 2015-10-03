/*
 * try to simplify stream.Transform, if possible.
 */

"use strict";

import Promise from "bluebird";
import { Duplex } from "stream";

/*
 * The transformer can be in two states:
 * - flowing - output spigot is open, waiting for more incoming data: `_read`
 *   was called, and all `push` calls have returned true
 * - stopped - waiting for permission in the form of a `_read` call: `_write`
 *   may have been called, but we're buffering it for now
 */
const FLOWING = 0;
const STOPPED = 1;

export class Transform extends Duplex {
  /*
   * options:
   * - transform: `(Buffer) => Promise(Buffer)`
   * - flush: `() => Promise()`
   */
  constructor(options = {}) {
    super(options);

    this._debug = options.debug;

    this._transform = options.transform || (() => {
      throw new Error("not implemented");
    });
    this._flush = options.flush || (() => Promise.resolve());

    // assume we can send data until 'highWaterMark', to start with.
    this._state = FLOWING;
    this._nextChunk = null;
    this._nextCallback = null;

    this.once("prefinish", () => {
      if (this._debug) console.log(this._debug + ": prefinish");

      Promise.try(() => this._flush()).then(() => {
        this.push(null);
      }, error => this.emit('error', error));
    });
  }

  _write(chunk, encoding, callback) {
    if (this._debug) console.log(this._debug + ": write", chunk);
    this._nextChunk = chunk;
    this._nextCallback = callback;
    if (this._state == FLOWING) this._next();
  }

  _next() {
    if (this._nextChunk == null) return;

    const chunk = this._nextChunk;
    const callback = this._nextCallback;
    this._nextChunk = null;
    this._nextCallback = null;

    if (this._debug) console.log(this._debug + ": transform", chunk);
    Promise.try(() => this._transform(chunk)).then(data => {
      if (data != null) this.push(data);
      callback();
    }, error => callback(error));
  }

  _read() {
    if (this._debug) console.log(this._debug + ": read trigger; flow!");
    this._state = FLOWING;
    this._next();
  }

  push(data) {
    if (this._debug) console.log(this._debug + ": push", data);
    if (super.push(data)) return;
    if (this._debug) console.log(this._debug + ": stop!");
    this._state = STOPPED;
  }
}
