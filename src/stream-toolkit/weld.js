"use strict";

import stream from "stream";

/*
 * join a series of streams together with `pipe`, and then return a stream
 * that writes to the start and reads from the end. for example:
 *
 *     weld(a, b, c)
 *
 * does `a.pipe(b)` and `b.pipe(c)`, and returns a stream that writes into
 * `a` and reads from `c`.
 */
export function weld(...streams) {
  for (let i = 1; i < streams.length; i++) streams[i - 1].pipe(streams[i]);
  const first = streams[0];
  const last = streams[streams.length - 1];
  let rv = new stream.Transform();
  rv._transform = (data, encoding, callback) => {
    first.write(data, encoding, callback);
  };
  rv._flush = callback => {
    last.on("end", callback);
    first.end();
  };
  last.on("data", data => rv.push(data));
  return rv;
}
