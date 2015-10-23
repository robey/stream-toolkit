"use strict";

const stream = require("stream");
import Transform from "./transform";
import { promisify } from "./promise_wrappers";

const DEFAULT_BLOCK_SIZE = Math.pow(2, 20);  // 1MB

/*
 * Stream transform that buffers data until it reaches a desired block size,
 * then emits a single block.
 *
 * options:
 * - blockSize: default is 1MB
 * - exact: (boolean) slice blocks so that when at least `blockSize` bytes
 *   are available, emit a block of _exactly_ `blockSize` bytes (default:
 *   false)
 */
export function bufferStream(inOptions = {}) {
  const blockSize = inOptions.blockSize || DEFAULT_BLOCK_SIZE;
  const exact = inOptions.exact;

  let queue = [];
  let size = 0;

  const options = {
    name: "bufferingStream(" + blockSize + ")",
    transform: data => {
      queue.push(data);
      size += data.length;
      if (size >= blockSize) drain(exact);
    },
    flush: () => {
      drain(exact);
      if (size > 0) drain(false);
    }
  };
  for (const k in inOptions) options[k] = inOptions[k];

  const drain = exact => {
    if (size == 0) return;
    let buffer = Buffer.concat(queue, size);
    queue = [];
    size = 0;

    if (exact) {
      while (buffer.length >= blockSize) {
        rv.push(buffer.slice(0, blockSize));
        buffer = buffer.slice(blockSize);
      }
      queue.push(buffer);
      size = buffer.length;
    } else {
      rv.push(buffer);
    }
  };

  const rv = new Transform(options);
  return rv;
}


// ----- various ways of putting a buffer on the read or write side:

export function sinkStream(inOptions) {
  const buffers = [];
  const options = {
    name: "sinkStream",
    write: (chunk, encoding, callback) => {
      buffers.push(chunk);
      callback();
    }
  };
  for (const k in inOptions) options[k] = inOptions[k];
  const rv = promisify(new stream.Writable(options), options);
  rv.getBuffer = () => Buffer.concat(buffers);
  rv.reset = () => buffers.splice(0, buffers.length);
  return rv;
}

export function nullSinkStream(inOptions) {
  const options = {
    name: "nullSinkStream",
    write: (chunk, encoding, callback) => callback()
  };
  for (const k in inOptions) options[k] = inOptions[k];
  return promisify(new stream.Writable(options), options);
}

export function sourceStream(buffer, inOptions) {
  const options = {
    name: "sourceStream",
    read: () => {
      rv.push(buffer);
      rv.push(null);
    }
  };
  for (const k in inOptions) options[k] = inOptions[k];
  const rv = promisify(new stream.Readable(options), options);
  return rv;
}

// shortcut for creating a SourceStream and piping it to a writable.
export function pipeFromBuffer(buffer, writable, options) {
  const source = sourceStream(buffer);
  source.pipe(writable, options);
  return source.endPromise();
}

// shortcut for creating a SinkStream and piping a readable into it.
export function pipeToBuffer(readable, options) {
  const sink = sinkStream();
  readable.pipe(sink, options);
  return sink.finishPromise().then(() => sink.getBuffer());
}
