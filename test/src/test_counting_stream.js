const mocha_sprinkles = require("mocha-sprinkles");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

const future = mocha_sprinkles.future;

describe("CountingStream", () => {
  it("counts", (done) => {
    const sink = toolkit.sinkStream();
    const source = new stream.PassThrough();
    const counter = toolkit.countingStream();
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
