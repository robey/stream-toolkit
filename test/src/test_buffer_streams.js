"use strict";

import { Readable } from "stream";
import { bufferStream, nullSinkStream, sinkStream, sourceStream } from "../../lib/stream-toolkit/buffer_streams";
import { future } from "mocha-sprinkles";

import "should";
import "source-map-support";


describe("bufferStream", () => {
  it("combines small buffers", future(() => {
    const queue = [];
    const s = bufferStream();
    s.on("data", data => queue.push(data.toString()));
    s.write("hell");
    s.write("ok");
    s.write("it");
    s.write("ty!");
    s.end();
    return s.endPromise().then(() => {
      queue.should.eql([ "hellokitty!" ]);
    });
  }));

  it("stops when it hits its target", future(() => {
    const queue = [];
    const s = bufferStream({ blockSize: 5 });
    s.on("data", data => queue.push(data.toString()));
    s.write("hell");
    s.write("ok");
    s.write("it");
    s.write("ty!");
    s.end();
    return s.endPromise().then(() => {
      queue.should.eql([ "hellok", "itty!" ]);
    });
  }));

  it("slices exactly when asked", future(() => {
    const queue = [];
    const s = bufferStream({ blockSize: 5, exact: true });
    s.on("data", data => queue.push(data.toString()));
    s.write("hell");
    s.write("okittyhowareyou!");
    s.end();
    return s.endPromise().then(() => {
      queue.should.eql([ "hello", "kitty", "howar", "eyou!" ]);
    });
  }));
});

describe("SinkStream", () => {
  it("collects data as it's written", (done) => {
    const sink = sinkStream();
    sink.on("finish", () => {
      sink.getBuffer().toString("UTF-8").should.eql("hello there!");
      done();
    });
    const source = new Readable();
    source._read = () => null;
    source.push(new Buffer("hello ", "UTF-8"));
    source.push(new Buffer("there!", "UTF-8"));
    source.push(null);
    source.pipe(sink);
  });
});

describe("SourceStream", () => {
  it("sends data", () => {
    const source = sourceStream("hello sailor");
    source.read(5).toString("UTF-8").should.eql("hello");
    source.read(7).toString("UTF-8").should.eql(" sailor");
    (source.read() == null).should.eql(true);
  });
});

describe("NullSinkStream", () => {
  it("throws away data", (done) => {
    const source = sourceStream("hello sailor");
    const sink = nullSinkStream();
    source.pipe(sink);
    source.on("end", () => done());
  });
});
