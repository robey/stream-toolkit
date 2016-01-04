"use strict";

import Transform from "./transform";
import { Duplex } from "stream";
import { promisify } from "./promise_wrappers";

/*
 * join a series of streams together with `pipe`, and then return a stream
 * that writes to the start and reads from the end. for example:
 *
 *     weld(a, b, c)
 *
 * does `a.pipe(b)` and `b.pipe(c)`, and returns a stream that writes into
 * `a` and reads from `c`.
 *
 * the last object can be an options object with fields:
 *   - readableObjectMode
 *   - writableObjectMode
 * which will apply to the new, welded stream, if present. (if the final
 * parameter doesn't contain either field, we assume it's a stream.)
 */
export function weld(...streams) {
  const inOptions = streams[streams.length - 1];
  let total = streams.length;
  const options = {};
  if (inOptions.readableObjectMode || inOptions.writableObjectMode || inOptions.name) {
    for (const k in inOptions) options[k] = inOptions[k];
    total--;
  }

  for (let i = 1; i < total; i++) streams[i - 1].pipe(streams[i]);
  const first = promisify(streams[0]);
  const last = promisify(streams[total - 1]);

  let ready = true;
  const transform = new Duplex(options);

  transform._write = (data, encoding, callback) => first._write(data, encoding, callback);
  first.on("drain", () => this.emit("drain"));
  transform.on("prefinish", () => {
    first.end();
  });

  const readable = () => {
    while (ready) {
      const chunk = last.read();
      if (!chunk) return;
      ready = transform.push(chunk);
    }
  };

  transform._read = () => {
    ready = true;
    readable();
  };

  last.on("readable", readable);
  last.on("error", error => transform.emit("error", error));
  last.on("end", () => transform.push(null));

  const rv = promisify(transform, options);
  rv.__log(() => "weld " + first.__name + " -> " + last.__name);
  return rv;
}
