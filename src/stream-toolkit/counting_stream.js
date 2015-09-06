const promise_wrappers = require("./promise_wrappers");
const stream = require("stream");
const util = require("util");

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


function countingStream(options = {}) {
  return promise_wrappers.promisify(new CountingStream(options));
}


exports.countingStream = countingStream;
