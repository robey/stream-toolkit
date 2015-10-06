"use strict";

import Promise from "bluebird";
import stream from "stream";
import { promisify } from "../../lib/stream-toolkit/promise_wrappers";
import PullTransform from "../../lib/stream-toolkit/pull_transform";
import { eventually, future } from "mocha-sprinkles";

import "should";
import "source-map-support/register";

describe("PullTransform", () => {
  it("passthrough", future(() => {
    const t = new PullTransform({
      transform: t => t.get(3)
    });
    promisify(t);

    t.write("abcde");
    t.write("fghi");
    t.end();

    return t.readPromise(9).then(data => {
      return t.endPromise().then(() => {
        data.toString().should.eql("abcdefghi");
      });
    });
  }));

  it("can build objects", future(() => {
    const t = new PullTransform({
      transform: t => {
        return t.get(3).then(data => {
          if (!data || data.length < 3) return;
          return { val: data.toString() };
        });
      },
      readableObjectMode: true
    });
    promisify(t);

    t.write("abcde");
    t.write("fghi");
    t.end();

    return t.readPromise().then(obj => {
      obj.should.eql({ val: "abc" });
      return t.readPromise();
    }).then(obj => {
      obj.should.eql({ val: "def" });
      return t.readPromise();
    }).then(obj => {
      obj.should.eql({ val: "ghi" });
      return t.readPromise();
    }).then(obj => {
      (obj == null).should.eql(true);
    });
  }));

  it("can handle incomplete objects", future(() => {
    const t = new PullTransform({
      transform: t => {
        return t.get(3).then(data => {
          if (!data || data.length < 3) return null;
          return { val: data.toString() };
        });
      },
      readableObjectMode: true
    });
    promisify(t);

    t.write("abcde");
    t.write("fg");
    t.end();

    return t.readPromise().then(obj => {
      obj.should.eql({ val: "abc" });
      return t.readPromise();
    }).then(obj => {
      obj.should.eql({ val: "def" });
      return t.readPromise();
    }).then(obj => {
      (obj == null).should.eql(true);
    });
  }));

  it("can breakdown objects", future(() => {
    // this doesn't really use any of the pull mechanism, so it's really a sanity check.
    const t = new PullTransform({
      transform: t => {
        return t.get().then(obj => {
          if (!obj) return null;
          return new Buffer(obj.val);
        });
      },
      writableObjectMode: true
    });
    promisify(t);

    t.write({ val: "abcde" });
    t.write({ val: "fg" });
    t.end();

    return t.readPromise().then(data => {
      data.toString().should.eql("abcde");
      return t.readPromise();
    }).then(data => {
      data.toString().should.eql("fg");
      return t.readPromise();
    }).then(data => {
      (data == null).should.eql(true);
    });
  }));

  it("handles lots of buffering", future(() => {
    const t = new PullTransform({
      transform: t => {
        return t.get(1024).then(data => {
          if (!data || data.length < 1024) return null;
          return { val: data.toString() };
        });
      },
      readableObjectMode: true
    });
    promisify(t);

    const data1 = new Buffer(32);
    data1.fill(0x78);
    Promise.delay(10).then(() => {
      for (let i = 0; i < 32; i++) t.write(data1);
      t.end();
    });

    return t.readPromise().then(obj => {
      obj.val.length.should.eql(1024);
      for (let i = 0; i < 1024; i++) obj.val[i].should.eql("x");
      return t.readPromise();
    }).then(obj => {
      (obj == null).should.eql(true);
    });
  }));

  it("random-length chaining", future(() => {
    const t = new PullTransform({
      transform: t => {
        return t.get(1).then(data1 => {
          if (!data1) return null;
          return t.get(data1[0]);
        }).then(data2 => {
          if (!data2) return null;
          return t.get(data2[1]);
        }).then(data3 => {
          if (!data3) return null;
          return { val: data3.toString() };
        });
      },
      readableObjectMode: true
    });
    promisify(t);

    t.write(new Buffer([ 2, 0, 5, 0x68, 0x65, 0x6c, 0x6c, 0x6f ]));
    t.write(new Buffer([ 4, 9, 4, 7, 7, 0x77, 0x68, 0x61, 0x74 ]));
    // for fun, chop one up.
    t.write(new Buffer([ 6, 100, 7, 4 ]));
    t.write(new Buffer([ 101, 102, 103, 0x6d, 0x79, 0x73 ]));
    t.write(new Buffer([ 0x74, 0x65, 0x72, 0x79 ]));
    t.end();

    return t.readPromise().then(obj => {
      obj.should.eql({ val: "hello" });
      return t.readPromise();
    }).then(obj => {
      obj.should.eql({ val: "what" });
      return t.readPromise();
    }).then(obj => {
      obj.should.eql({ val: "mystery" });
      return t.readPromise();
    }).then(obj => {
      (obj == null).should.eql(true);
    });
  }));

  it("honors highWaterMark", future(() => {
    const t = new PullTransform({
      transform: t => t.get(5),
      highWaterMark: 10
    });
    promisify(t);

    t.write("abc");
    t.write("defg");
    t.write("hijkl");
    t.write("mnop");

    return Promise.delay(10).then(() => {
      t._buffers.length.should.eql(1);
      t._buffers[0].toString().should.eql("kl");
      t._readableState.length.should.eql(10);
      t._readableState.buffer.map(b => b.toString()).should.eql([ "abcde", "fghij" ]);
    });
  }));

  it("can nest", future(() => {
    // frame decoder: 1 byte length, followed by data bytes. the PullTransform
    // generates a new ReadableStream for each block.
    const t = new PullTransform({
      transform: t => {
        return t.get(1).then(data => {
          if (!data) return null;
          const nested = new stream.Readable();
          promisify(nested);
          // `_read` signal must be forwarded to the PullTransform.
          nested._read = () => t._read();
          t.push(nested);
          t.get(data[0]).then(block => {
            // not necessary here, but for longer-living streams: forward
            // the `_stop` signal back to the PullTransform.
            if (!nested.push(block)) t._stop();
            nested.push(null);
          });
          // undo any `_stop` signal from downstream, since the nested stream
          // is over now.
          return nested.endPromise().then(() => t._read());
        });
      },
      highWaterMark: 10,
      readableObjectMode: true
    });
    promisify(t);

    t.write(new Buffer([ 3, 0x4a, 0x4b, 0x4c, 2, 0x32, 0x33 ]));
    t.end();

    return t.readPromise().then(newStream => {
      return newStream.readPromise(10).then(data => {
        data.toString().should.eql("JKL");
        return newStream.readPromise(10);
      }).then(data => {
        (data == null).should.eql(true);
      });
    }).then(() => {
      return t.readPromise();
    }).then(newStream => {
      return newStream.readPromise(10).then(data => {
        data.toString().should.eql("23");
        return newStream.readPromise(10);
      }).then(data => {
        (data == null).should.eql(true);
      });
    }).then(() => {
      return t.readPromise();
    }).then(newStream => {
      (newStream == null).should.eql(true);
    });
  }));
});
