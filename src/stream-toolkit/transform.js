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

/*
 * Transform from the nodejs "stream" library, with the following changes:
 * - simplified implementation using ES6
 * - `transform` and `flush` functions must be passed in options (not
 *   overridden)
 * - `transform` and `flush` functions return a Promise instead of calling a
 *   callback
 *
 * The last point has the side effect of running pending buffer operations
 * on the next event loop tick instead of immediately. This may be considered
 * a benefit or disadvantage, depending on your personal perspective.
 */
export default class Transform extends Duplex {
  /*
   * options:
   * - transform: `(Buffer) => Promise(Buffer)`
   * - flush: `() => Promise()`
   */
  constructor(options = {}) {
    super(options);

    this._transform = options.transform || (() => {
      throw new Error("not implemented");
    });
    this._flush = options.flush || (() => Promise.resolve());

    // assume we can send data until 'highWaterMark', to start with.
    this._state = FLOWING;
    this._nextChunk = null;
    this._nextCallback = null;

    this.once("prefinish", () => {
      Promise.try(() => this._flush()).then(() => {
        this.push(null);
      }, error => this.emit('error', error));
    });
  }

  _write(chunk, encoding, callback) {
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

    Promise.try(() => this._transform(chunk)).then(data => {
      if (data != null) this.push(data);
      callback();
    }, error => callback(error));
  }

  _read() {
    this._state = FLOWING;
    this._next();
  }

  push(data) {
    if (super.push(data)) return;
    this._state = STOPPED;
  }
}
