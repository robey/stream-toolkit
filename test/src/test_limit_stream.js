const mocha_sprinkles = require("mocha-sprinkles");
const Promise = require("bluebird");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

const future = mocha_sprinkles.future;

describe("LimitStream", () => {
  it("stops before the end", (done) => {
    const sink = toolkit.sinkStream();
    const source = toolkit.sourceStream("hello sailor");
    const s = toolkit.limitStream(source, 10);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello sail");
      s.isFinished().should.eql(true);
      source.read().toString().should.eql("or");
      done();
    });
  });

  it("notices if there's not enough data", (done) => {
    const sink = toolkit.sinkStream();
    const source = toolkit.sourceStream("hello");
    const s = toolkit.limitStream(source, 10);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("hello");
      s.isFinished().should.eql(false);
      (source.read() == null).should.eql(true);
      done();
    });
  });

  it("reacts correctly to slow data", future(() => {
    const sink = toolkit.sinkStream();
    const source = new stream.Readable();
    source._read = () => null;
    const s = toolkit.limitStream(source, 10);
    s.pipe(sink);
    return new Promise((resolve, reject) => {
      sink.on("finish", () => {
        sink.getBuffer().toString().should.eql("hello sail");
        s.isFinished().should.eql(true);
        source.read().toString().should.eql("or");
        resolve();
      });
      Promise.delay(10).then(() => {
        source.push(new Buffer("hello"));
        Promise.delay(10).then(() => {
          source.push(new Buffer(" sailor"));
        });
      });
    });
  }));

  it("can be chained", (done) => {
    const sink1 = toolkit.sinkStream();
    const source = toolkit.sourceStream("hello sailor!");
    const s = toolkit.limitStream(source, 4);
    s.pipe(sink1);
    sink1.on("finish", () => {
      const sink2 = toolkit.sinkStream();
      const s = toolkit.limitStream(source, 4);
      s.pipe(sink2);
      sink2.on("finish", () => {
        sink1.getBuffer().toString().should.eql("hell");
        sink2.getBuffer().toString().should.eql("o sa");
        source.read().toString().should.eql("ilor!");
        done();
      });
    });
  });

  it("can be nested", (done) => {
    const sink = toolkit.sinkStream();
    const source = toolkit.sourceStream("hello sailor!");
    const s1 = toolkit.limitStream(source, 10);
    s1.read(2).toString().should.eql("he");
    const s2 = toolkit.limitStream(s1, 5);
    s2.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("llo s");
      s1.read(10).toString().should.eql("ail");
      done();
    });
  });

  it("handles the stupid 0-length case", (done) => {
    const sink = toolkit.sinkStream();
    const source = toolkit.sourceStream("hello sailor!");
    const s = toolkit.limitStream(source, 0);
    s.pipe(sink);
    sink.on("finish", () => {
      sink.getBuffer().toString().should.eql("");
      s.isFinished().should.eql(true);
      done();
    });
  });
});
