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
 * PullTransform is similar to Transform, but instead of transforming data
 * as it arrives (and being responsible for your own buffering), the engine
 * buffers for you, and you _pull_ data out of the buffer as you need it.
 * Like Transform, PullTransform handles the flow control for you.
 *
 * To start, PullTransform calls the `transform` function and expects to
 * receive a `Promise`. When the promise is fulfilled, if the incoming stream
 * hasn't ended yet, `transform` is called again. This repeats until the
 * incoming stream ends. After that, once the last `transform` promise has
 * resolved, the outbound stream will be ended (by pushing `null`).
 *
 * If the promise resolves to a value (not null or undefined), PullTransform
 * will push it to the outbound stream. You may also/instead call `push`
 * directly, just like a normal Transform.
 *
 * To pull data from the incoming buffer, call:
 * - `get(count): Promise`
 *
 * The PullTransform object is passed to `transform` to make it easier to
 * call `get` on it.
 *
 * If the readable stream is in object mode, `count` is ignored, and each
 * call returns a promise for one object. Otherwise, the promise will resolve
 * to a `Buffer` of at least `count` bytes, once those bytes arrive.
 *
 * If the incoming stream ends before the requested `count` has arrived, the
 * promise will resolve to the remaining bytes, or `null`.
 *
 * Here's an example of a PullTransform that reads (exactly) 16 bytes at a
 * time, and converts each 16-byte "frame" into an object. Any truncated
 * frame at the end is discarded.
 *
 *     const t = new PullTransform({
 *       readableObjectMode: true,
 *       transform: t => {
 *         return t.get(16).then(data => {
 *           // discard short frames.
 *           if (!data || data.length < 16) return null;
 *           return { frame: data };
 *         });
 *       },
 *     });
 */
export class PullTransform extends Duplex {
  /*
   * options:
   * - transform: `(PullTransform) => Promise()`
   * - readableObjectMode (from Duplex)
   * - writableObjectMode (from Duplex)
   */
  constructor(options = {}) {
    super(options);

    this._writeObjects = options.writableObjectMode;
    this._debug = options.debug;
    this._transform = options.transform || (() => {
      throw new Error("not implemented");
    });

    // assume we can send data until 'highWaterMark', to start with.
    this._state = FLOWING;
    this._ended = false;

    // queued up writes, waiting for a transformation.
    this._buffers = [];
    this._bufferSize = 0;
    this._nextCallback = null;

    // queued up get, waiting to have enough data to continue.
    this._getCount = 0;
    this._getResolve = null;

    this.once("prefinish", () => {
      // tell the pump to wrap it up.
      if (this._debug) console.log(this._debug, "prefinish");
      this._ended = true;
      this._next();
    });

    this._pump();
  }

  /*
   * Return a Promise for exactly the next `count` incoming bytes. If the
   * writable side is in object mode, `count` is ignored and you will get a
   * Promise for an object.
   *
   * This method is serial: You must not call this method until a previous
   * call's Promise completes.
   */
  get(count) {
    this._getCount = count;
    if (this._writeObjects) this._getCount = 1;

    return new Promise((resolve, reject) => {
      this._getResolve = resolve;
      if (this._state == FLOWING) this._next();
    });
  }

  _pump() {
    if (this._debug) console.log(this._debug, "pump loop");
    if (this._ended) {
      if (this._debug) console.log(this._debug, "goodbye");
      this.push(null);
      return;
    }
    this._transform(this).then(data => {
      if (this._debug) console.log(this._debug, "transform got", data);
      if (data != null) this.push(data);
      this._pump();
    });
  }

  _write(chunk, encoding, callback) {
    if (this._debug) console.log(this._debug, "write", chunk);
    this._buffers.push(chunk);
    this._bufferSize += this._writeObjects ? 1 : chunk.length;
    this._nextCallback = callback;
    if (this._state == FLOWING) this._next();
  }

  _next() {
    if (this._debug) console.log(this._debug, "next");
    if (!this._getResolve) return;

    // do we have enough data to fill a current `get`?
    if (this._getCount > this._bufferSize && !this._ended) {
      if (this._debug) console.log(this._debug, "wait for moar");
      // ack the latest write. we want moar! moar!
      if (!this._nextCallback) return;
      const callback = this._nextCallback;
      this._nextCallback = null;
      return callback();
    }

    if (this._writeObjects) return this._respondToGet(this._consumeOneBuffer());

    // if we fell here because of this._ended, allow a null or truncated buffer.
    if (this._buffers.length == 0) return this._respondToGet(null);

    const consumed = [];
    while (this._buffers.length > 0 && this._getCount >= this._buffers[0].length) {
      this._getCount -= this._buffers[0].length;
      consumed.push(this._consumeOneBuffer());
    }
    if (this._getCount > 0 && this._buffers.length > 0) {
      consumed.push(this._buffers[0].slice(0, this._getCount));
      this._buffers[0] = this._buffers[0].slice(this._getCount);
      this._bufferSize -= this._getCount;
    }
    return this._respondToGet(consumed.length > 1 ? Buffer.concat(consumed) : consumed[0]);
  }

  _consumeOneBuffer() {
    this._bufferSize -= this._writeObjects ? 1 : this._buffers[0].length;
    return this._buffers.shift();
  }

  _respondToGet(obj) {
    if (this._debug) console.log(this._debug, "respondToGet", obj);
    const resolve = this._getResolve;
    this._getCount = 0;
    this._getResolve = null;
    return resolve(obj);
  }

  _read() {
    if (this._debug) console.log(this._debug, "read");
    this._state = FLOWING;
    this._next();
  }

  _stop() {
    this._state = STOPPED;
  }

  push(data) {
    if (this._debug) console.log(this._debug, "push", data);
    try {
      if (super.push(data)) return;
    } catch (error) {
      this.emit("error", error);
    }
    this._stop();
  }
}
