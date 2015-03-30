const mocha_sprinkles = require("mocha-sprinkles");
const Promise = require("bluebird");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

const future = mocha_sprinkles.future;

describe("CompoundStream", () => {
  it("combines several streams", (done) => {
    const sink = toolkit.sinkStream();
    const source1 = toolkit.sourceStream("hello ");
    const source2 = toolkit.sourceStream("sailor");
    const source3 = toolkit.sourceStream("!");
    const s = toolkit.compoundStream([ source1, source2, source3 ]);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });
  });

  it("generates new streams on demand", (done) => {
    const sink = toolkit.sinkStream();
    const source1 = toolkit.sourceStream("hello ");
    const source2 = toolkit.sourceStream("sailor");
    const source3 = toolkit.sourceStream("!");
    var state = 0;
    const generator = () => {
      state += 1;
      switch (state) {
        case 1: return source1;
        case 2: return source2;
        case 3: return source3;
        default: return null;
      }
    };
    const s = toolkit.compoundStream(generator);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });
  });

  it("can re-join several LimitStreams", (done) => {
    const source = toolkit.sourceStream("hello sailor!");
    const sink = toolkit.sinkStream();
    var state = 0;
    const generator = () => {
      state += 1;
      switch (state) {
        case 1: return toolkit.limitStream(source, 5);
        case 2: return toolkit.limitStream(source, 3);
        case 3: return toolkit.limitStream(source, 5);
        default: return null;
      }
    };
    const s = toolkit.compoundStream(generator);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });
  });

  it("combines streams from promises", (done) => {
    const sink = toolkit.sinkStream();
    const deferred1 = Promise.defer();
    const deferred2 = Promise.defer();
    const s = toolkit.compoundStream([ deferred1.promise, deferred2.promise ]);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sailor!");
      done();
    });
    Promise.delay(10).then(() => {
      deferred1.resolve(toolkit.sourceStream("hello "));
      Promise.delay(50);
    }).then(() => {
      deferred2.resolve(toolkit.sourceStream("sailor!"));
    });
  });
});
