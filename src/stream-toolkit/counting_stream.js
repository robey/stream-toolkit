"use strict";

import stream from "stream";
import { promisify } from "./promise_wrappers";


// transform for buffer streams that counts how many bytes came through.
class CountingStream extends stream.Transform {
  constructor(options = {}) {
    super(options);
    this.bytes = 0;
    this.lastUpdate = 0;
  }

  _transform(buffer, encoding, callback) {
    if (buffer && buffer instanceof Buffer) {
      this.bytes += buffer.length;
    }
    this.emit("count", this.bytes);
    this.push(buffer);
    callback();
  }

  _flush(callback) {
    this.push(null);
    callback();
  }

  close() {
    this.push(null);
  }
}


export default function countingStream(options = {}) {
  return promisify(new CountingStream(options));
}
