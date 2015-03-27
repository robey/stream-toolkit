const mocha_sprinkles = require("mocha-sprinkles");
const Promise = require("bluebird");
const should = require("should");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

const future = mocha_sprinkles.future;

describe("readPromise", () => {
  it("works on a pre-filled stream", future(() => {
    const source = toolkit.sourceStream("hello");
    return source.readPromise(5).then((buffer) => {
      buffer.toString().should.eql("hello");
    });
  }));

  it("works on a delayed stream", future(() => {
    const s = toolkit.promisify(new stream.Readable());
    s._read = () => null;
    const promise = s.readPromise(5);
    return Promise.delay(50).then(() => {
      s.push("hi");
      return Promise.delay(50);
    }).then(() => {
      s.push(" there.");
      return promise;
    }).then((buffer) => {
      buffer.toString().should.eql("hi th");
    });
  }));

  it("handles a close event", future(() => {
    const s = toolkit.promisify(new stream.Readable());
    s._read = () => null;
    const promise = s.readPromise(5);
    return Promise.delay(50).then(() => {
      s.push("hi");
      s.push(null);
      return promise;
    }).then((buffer) => {
      buffer.toString().should.eql("hi");
    });
  }));
});
