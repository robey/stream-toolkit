"use strict";

import stream from "stream";
import { inject, pipeToBuffer, setDebugLogger, sourceStream, Transform, weld } from "../../lib/stream-toolkit";
import { future } from "mocha-sprinkles";


const capitalizer = new stream.Transform();
capitalizer._transform = (data, _, callback) => {
  capitalizer.push(new Buffer(data.toString().toUpperCase()));
  callback();
};

const prefixer = new stream.Transform();
prefixer._transform = (data, _, callback) => {
  prefixer.push(data);
  callback();
};
prefixer.push(new Buffer("<<"));

const suffixer = new stream.Transform();
suffixer._transform = (data, _, callback) => {
  suffixer.push(data);
  callback();
};
suffixer._flush = (callback) => {
  suffixer.push(new Buffer(">>"));
  callback();
};

describe("weld", () => {
  it("welds a few streams together", future(() => {
    const source = sourceStream("hello sailor!");
    const s = weld(capitalizer, prefixer, suffixer);
    source.pipe(s);
    return pipeToBuffer(s).then((buffer) => {
      buffer.toString().should.eql("<<HELLO SAILOR!>>");
    });
  }));
});
