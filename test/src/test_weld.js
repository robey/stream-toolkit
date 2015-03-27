const mocha_sprinkles = require("mocha-sprinkles");
const stream = require("stream");
const toolkit = require("../../lib/stream-toolkit");
const util = require("util");

const future = mocha_sprinkles.future;

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
    const source = toolkit.sourceStream("hello sailor!");
    const s = toolkit.weld(capitalizer, prefixer, suffixer);
    source.pipe(s);
    return toolkit.pipeToBuffer(s).then((buffer) => {
      buffer.toString().should.eql("<<HELLO SAILOR!>>");
    });
  }));
});
