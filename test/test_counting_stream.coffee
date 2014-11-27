mocha_sprinkles = require "mocha-sprinkles"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "CountingStream", ->
  it "counts", (done) ->
    sink = toolkit.sinkStream()
    source = new stream.PassThrough()
    counter = toolkit.countingStream()
    source.pipe(counter)
    counter.pipe(sink)
    bytes = []
    counter.on "count", (n) -> bytes.push n
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello not again!"
      bytes.length.should.eql 2
      bytes[0].should.eql 6
      bytes[1].should.eql 16
      done()
    source.write "hello "
    source.write "not again!"
    source.end()
