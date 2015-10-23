"use strict";

import stream from "stream";
import { inject, pipeToBuffer, setDebugLogger, sourceStream, Transform, weld } from "../../lib/stream-toolkit";
import { future } from "mocha-sprinkles";


function capitalizer() {
  return new Transform({
    transform: data => new Buffer(data.toString().toUpperCase())
  });
}

function prefixer() {
  const rv = new Transform({
    transform: data => data
  });
  rv.push(new Buffer("<<"));
  return rv;
}

function suffixer() {
  return new Transform({
    transform: data => data,
    flush: () => new Buffer(">>")
  });
}

function dumper() {
  return new Transform({
    transform: obj => new Buffer(obj.value),
    writableObjectMode: true
  });
}

describe("weld", () => {
  it("welds a few streams together", future(() => {
    const source = sourceStream("hello sailor!");
    const s = weld(capitalizer(), prefixer(), suffixer());
    source.pipe(s);
    return pipeToBuffer(s).then(buffer => {
      buffer.toString().should.eql("<<HELLO SAILOR!>>");
    });
  }));

  it("can do objects", future(() => {
    const s = weld(dumper(), prefixer(), { writableObjectMode: true });
    s.write({ value: "hello" });
    s.end();
    return pipeToBuffer(s).then(buffer => {
      buffer.toString().should.eql("<<hello");
    });
  }))
});
