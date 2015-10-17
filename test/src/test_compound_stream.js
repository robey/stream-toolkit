"use strict";

import Promise from "bluebird";
import stream from "stream";
import { compoundStream, limitStream, sinkStream, sourceStream } from "../../lib/stream-toolkit";
import { future } from "mocha-sprinkles";

import "source-map-support/register";


describe("compoundStream", () => {
  it("combines several streams", (done) => {
    const sink = sinkStream();
    const source1 = sourceStream("hello ");
    const source2 = sourceStream("sailor");
    const source3 = sourceStream("!");
    const s = compoundStream();
    s.write(source1);
    s.write(source2);
    s.write(source3);
    s.end();
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });
  });

  it("can handle slow adds", (done) => {
    const sink = sinkStream();
    const source1 = sourceStream("hello ");
    const source2 = sourceStream("sailor");
    const source3 = sourceStream("!");
    const s = compoundStream();

    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });

    setTimeout(() => s.write(source1), 10);
    setTimeout(() => s.write(source2), 40);
    setTimeout(() => s.write(source3), 70);
    setTimeout(() => s.end(), 100);
  });

  it("can chain new streams to the end of previous ones", (done) => {
    const sink = sinkStream();
    const source1 = sourceStream("hello ");
    const source2 = sourceStream("sailor");
    const source3 = sourceStream("!");
    const s = compoundStream();

    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });

    s.write(source1);
    source1.on("end", () => s.write(source2));
    source2.on("end", () => s.write(source3));
    source3.on("end", () => s.end());
  });

  it("can re-join several LimitStreams", (done) => {
    const source = sourceStream("hello sailor!");
    const sink = sinkStream();

    const s = compoundStream();
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });

    const source1 = limitStream(source, 5);
    s.write(source1);
    source1.on("end", () => {
      const source2 = limitStream(source, 3);
      s.write(source2);
      source2.on("end", () => {
        const source3 = limitStream(source, 5);
        s.write(source3);
        source3.on("end", () => s.end());
      });
    });
  });
});
