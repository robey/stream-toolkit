"use strict";

import stream from "stream";
import { countingStream, sinkStream } from "../../lib/stream-toolkit";
import { future } from "mocha-sprinkles";

import "source-map-support/register";


describe("CountingStream", () => {
  it("counts", (done) => {
    const sink = sinkStream();
    const source = new stream.PassThrough();
    const counter = countingStream();
    source.pipe(counter);
    counter.pipe(sink);
    const bytes = [];
    counter.on("count", (n) => bytes.push(n));
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello not again!");
      bytes.length.should.eql(2);
      bytes[0].should.eql(6);
      bytes[1].should.eql(16);
      done();
    });
    source.write("hello ");
    source.write("not again!");
    source.end();
  });
});
