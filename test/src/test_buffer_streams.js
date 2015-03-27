const should = require("should");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

describe("SinkStream", () => {
  it("collects data as it's written", (done) => {
    const sink = toolkit.sinkStream();
    sink.on("finish", () => {
      sink.getBuffer().toString("UTF-8").should.eql("hello there!");
      done();
    });
    const source = new stream.Readable();
    source._read = () => null;
    source.push(new Buffer("hello ", "UTF-8"));
    source.push(new Buffer("there!", "UTF-8"));
    source.push(null);
    source.pipe(sink);
  });
});

describe("SourceStream", () => {
  it("sends data", () => {
    const source = toolkit.sourceStream("hello sailor");
    source.read(5).toString("UTF-8").should.eql("hello");
    source.read(7).toString("UTF-8").should.eql(" sailor");
    (source.read() == null).should.eql(true);
  });
});

describe("NullSinkStream", () => {
  it("throws away data", (done) => {
    const source = toolkit.sourceStream("hello sailor");
    const sink = toolkit.nullSinkStream();
    source.pipe(sink);
    source.on("end", () => done());
  });
});
