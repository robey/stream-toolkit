"use strict";

import Promise from "bluebird";
import { Transform } from "../../lib/stream-toolkit/transform";
import { eventually, future } from "mocha-sprinkles";

import "should";
import "source-map-support/register";

describe("Transform", () => {
  it("writable side consumption", future(() => {
    let transformed = 0;
    const tx = new Transform({
      highWaterMark: 10,
      transform: (chunk) => {
        transformed += chunk.length;
        tx.push(chunk);
      }
    });

    for (let i = 1; i <= 10; i++) {
      tx.write(new Buffer(i));
    }
    tx.end();

    return eventually(() => {
      transformed.should.eql(10);
      tx._readableState.length.should.eql(10);
      tx._nextChunk.length.should.eql(5);
      tx._writableState.getBuffer().map(c => c.chunk.length).should.eql([ 6, 7, 8, 9, 10 ]);
    });
  }));

  it("passthrough", future(() => {
    const pt = new Transform({ transform: chunk => chunk });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));
    pt.write(new Buffer('bazy'));
    pt.write(new Buffer('kuel'));
    pt.end();

    return eventually(() => {
      pt.read(5).toString().should.eql("foogb");
      pt.read(5).toString().should.eql("arkba");
      pt.read(5).toString().should.eql("zykue");
      pt.read(5).toString().should.eql("l");
    });
  }));

  it("object passthrough", future(() => {
    const pt = new Transform({ objectMode: true, transform: chunk => chunk });

    pt.write(1);
    pt.write(true);
    pt.write(false);
    pt.write(0);
    pt.write('foo');
    pt.write('');
    pt.write({ a: 'b'});
    pt.end();

    return eventually(() => {
      pt.read().should.eql(1);
      pt.read().should.eql(true);
      pt.read().should.eql(false);
      pt.read().should.eql(0);
      pt.read().should.eql('foo');
      pt.read().should.eql('');
      pt.read().should.eql({ a: 'b'});
    });
  }));

  it("simple transform", future(() => {
    const pt = new Transform({
      transform: chunk => {
        const ret = new Buffer(chunk.length);
        ret.fill('x');
        pt.push(ret);
      }
    });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));
    pt.write(new Buffer('bazy'));
    pt.write(new Buffer('kuel'));
    pt.end();

    return eventually(() => {
      pt.read(5).toString().should.eql('xxxxx');
      pt.read(5).toString().should.eql('xxxxx');
      pt.read(5).toString().should.eql('xxxxx');
      pt.read(5).toString().should.eql('x');
    });
  }));

  it("simple object transform", future(() => {
    var pt = new Transform({ objectMode: true, transform: chunk => JSON.stringify(chunk) });

    pt.write(1);
    pt.write(true);
    pt.write(false);
    pt.write(0);
    pt.write('foo');
    pt.write('');
    pt.write({ a: 'b'});
    pt.end();

    return eventually(() => {
      pt.read().should.eql('1');
      pt.read().should.eql('true');
      pt.read().should.eql('false');
      pt.read().should.eql('0');
      pt.read().should.eql('"foo"');
      pt.read().should.eql('""');
      pt.read().should.eql('{"a":"b"}');
    });
  }));

  it("async passthrough", future(() => {
    const pt = new Transform({
      transform: chunk => {
        return Promise.delay(10).then(() => {
          pt.push(chunk);
        });
      }
    });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));
    pt.write(new Buffer('bazy'));
    pt.write(new Buffer('kuel'));
    pt.end();

    return new Promise((resolve, reject) => {
      pt.on('finish', () => {
        return Promise.delay(20).then(() => {
          pt.read(5).toString().should.eql('foogb');
          pt.read(5).toString().should.eql('arkba');
          pt.read(5).toString().should.eql('zykue');
          pt.read(5).toString().should.eql('l');
          resolve();
        });
      });
    });
  }));

  it("assymetric transform (expand)", future(() => {
    const pt = new Transform({
      transform: chunk => {
        return Promise.delay(10).then(() => {
          pt.push(chunk);
          return Promise.delay(10);
        }).then(() => {
          pt.push(chunk);
        });
      }
    });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));
    pt.write(new Buffer('bazy'));
    pt.write(new Buffer('kuel'));
    pt.end();

    return new Promise((resolve, reject) => {
      pt.on('finish', () => {
        return Promise.delay(25).then(() => {
          pt.read(5).toString().should.eql('foogf');
          pt.read(5).toString().should.eql('oogba');
          pt.read(5).toString().should.eql('rkbar');
          pt.read(5).toString().should.eql('kbazy');
          pt.read(5).toString().should.eql('bazyk');
          pt.read(5).toString().should.eql('uelku');
          pt.read(5).toString().should.eql('el');
        });
      });
      resolve();
    });
  }));

  it("assymetric transform (compress)", future(() => {
    let state = "";
    const pt = new Transform({
      transform: chunk => {
        const s = (chunk || "").toString();
        return Promise.delay(10).then(() => {
          state += s.charAt(0);
          if (state.length == 3) {
            pt.push(new Buffer(state));
            state = "";
          }
        });
      },
      flush: () => {
        // just output whatever we have.
        pt.push(new Buffer(state));
        state = '';
      }
    });

    pt.write(new Buffer('aaaa'));
    pt.write(new Buffer('bbbb'));
    pt.write(new Buffer('cccc'));
    pt.write(new Buffer('dddd'));
    pt.write(new Buffer('eeee'));
    pt.write(new Buffer('aaaa'));
    pt.write(new Buffer('bbbb'));
    pt.write(new Buffer('cccc'));
    pt.write(new Buffer('dddd'));
    pt.write(new Buffer('eeee'));
    pt.write(new Buffer('aaaa'));
    pt.write(new Buffer('bbbb'));
    pt.write(new Buffer('cccc'));
    pt.write(new Buffer('dddd'));
    pt.end();

    // 'abcdeabcdeabcd'
    return new Promise((resolve, reject) => {
      pt.on('finish', () => {
        return Promise.delay(10).then(() => {
          pt.read(5).toString().should.eql('abcde');
          pt.read(5).toString().should.eql('abcde');
          pt.read(5).toString().should.eql('abcd');
        });
      });
      resolve();
    });
  }));

  // this tests for a stall when data is written to a full stream
  // that has empty transforms.
  it("complex transform", future(() => {
    let count = 0;
    let saved = null;

    const pt = new Transform({
      highWaterMark: 3,
      transform: chunk => {
        if (count++ == 1) {
          saved = chunk;
        } else {
          if (saved) {
            pt.push(saved);
            saved = null;
          }
          pt.push(chunk);
        }
      }
    });

    return new Promise((resolve, reject) => {
      pt.once('readable', () => {
        process.nextTick(() => {
          pt.write(new Buffer('d'));
          pt.write(new Buffer('ef'), () => {
            pt.end();
          });
          Promise.delay(10).then(() => {
            // original test does this in one pass, but we need to give
            // promises time resolve. they use the event loop.
            pt.read().toString().should.eql('abc');
            return Promise.delay(1);
          }).then(() => {
            pt.read().toString().should.eql('def');
            (pt.read() == null).should.eql(true);
            resolve();
          });
        });
      });

      pt.write(new Buffer('abc'));
    });
  }));

  it("passthrough event emission", future(() => {
    const pt = new Transform({ transform: chunk => chunk });
    let emits = 0;

    pt.on('readable', () => {
      emits++;
    });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));
    return Promise.delay(10).then(() => {
      emits.should.eql(1);
      pt.read(5).toString().should.eql('foogb');
      (pt.read(5) == null).should.eql(true);

      pt.write(new Buffer('bazy'));
      pt.write(new Buffer('kuel'));
      return Promise.delay(10);
    }).then(() => {
      emits.should.eql(2);
      pt.read(5).toString().should.eql('arkba');
      pt.read(5).toString().should.eql('zykue');
      (pt.read(5) == null).should.eql(true);

      pt.end();
      return Promise.delay(10);
    }).then(() => {
      emits.should.eql(3);
      pt.read(5).toString().should.eql('l');
      (pt.read(5) == null).should.eql(true);

      // should not have emitted again:
      emits.should.eql(3);
    });
  }));

  it("passthrough event emission reordered", future(() => {
    let emits = 0;

    const pt = new Transform({ transform: chunk => chunk });
    pt.on('readable', () => {
      emits++;
    });

    pt.write(new Buffer('foog'));
    pt.write(new Buffer('bark'));

    return new Promise((resolve, reject) => {
      return Promise.delay(10).then(() => {
        emits.should.eql(1);
        pt.read(5).toString().should.eql('foogb');
        (pt.read(5) == null).should.eql(true);

        pt.once('readable', () => {
          pt.read(5).toString().should.eql('arkba');
          (pt.read(5) == null).should.eql(true);

          pt.once('readable', () => {
            pt.read(5).toString().should.eql('zykue');
            (pt.read(5) == null).should.eql(true);

            pt.once('readable', () => {
              pt.read(5).toString().should.eql('l');
              (pt.read(5) == null).should.eql(true);
              emits.should.eql(4);
              resolve();
            });

            pt.end();
          });

          pt.write(new Buffer('kuel'));
        });

        pt.write(new Buffer('bazy'));
      });
    });
  }));

  it("passthrough facaded", future(() => {
    let datas = [];

    return new Promise((resolve, reject) => {
      const pt = new Transform({ transform: chunk => chunk });
      pt.on('data', chunk => {
        datas.push(chunk.toString());
      });
      pt.on('end', function() {
        datas.should.eql(['foog', 'bark', 'bazy', 'kuel']);
        resolve();
      });

      pt.write(new Buffer('foog'));
      Promise.delay(10).then(() => {
        pt.write(new Buffer('bark'));
        Promise.delay(10).then(() => {
          pt.write(new Buffer('bazy'));
          Promise.delay(10).then(() => {
            pt.write(new Buffer('kuel'));
            Promise.delay(10).then(() => {
              pt.end();
            });
          });
        });
      });
    });
  }));

  it("object transform (json parse)", future(() => {
    const jp = new Transform({
      objectMode: true,
      transform: data => {
        jp.push(JSON.parse(data));
      }
    });

    // anything except null/undefined is fine.
    // those are "magic" in the stream API, because they signal EOF.
    const objects = [
      { foo: 'bar' },
      100,
      'string',
      { nested: { things: [ { foo: 'bar' }, 100, 'string' ] } }
    ];

    let ended = false;
    jp.on('end', () => {
      ended = true;
    });

    return Promise.all(objects.map(obj => {
      jp.write(JSON.stringify(obj));
      return Promise.delay(10).then(() => {
        jp.read().should.eql(obj);
      });
    })).then(() => {
      jp.end();
      return Promise.delay(10);
    }).then(() => {
      // read one more time to get the 'end' event
      jp.read();
      return Promise.delay(10);
    }).then(() => {
      ended.should.eql(true);
    });
  }));

  it("object transform (json stringify)", future(() => {
    const js = new Transform({
      objectMode: true,
      transform: data => {
        js.push(JSON.stringify(data));
      }
    });

    // anything except null/undefined is fine.
    // those are "magic" in the stream API, because they signal EOF.
    const objects = [
      { foo: 'bar' },
      100,
      'string',
      { nested: { things: [ { foo: 'bar' }, 100, 'string' ] } }
    ];

    let ended = false;
    js.on('end', function() {
      ended = true;
    });

    return Promise.all(objects.map(obj => {
      js.write(obj);
      return Promise.delay(10).then(() => {
        js.read().should.eql(JSON.stringify(obj));
      });
    })).then(() => {
      js.end();
      return Promise.delay(10);
    }).then(() => {
      // read one more time to get the 'end' event
      js.read();
      return Promise.delay(10);
    }).then(() => {
      ended.should.eql(true);
    });
  }));
});
