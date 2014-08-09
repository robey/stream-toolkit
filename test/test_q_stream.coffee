mocha_sprinkles = require "mocha-sprinkles"
Q = require "q"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "QStream", ->
  it "pushes when active", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    promise = qs.pipe(sink)
    qs.write(new Buffer([ 0x0f ])).then ->
      qs.write(new Buffer([ 0x0d ]))
    .then ->
      qs.close()
    .then ->
      promise
    .then ->
      toolkit.toHex(sink.getBuffer()).should.eql "0f0d"

  it "drains a full stream", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    promise1 = qs.write(new Buffer([ 0x41 ]))
    promise2 = qs.write(new Buffer([ 0x42 ]))
    qs.close()
    promise = qs.pipe(sink).then ->
      toolkit.toHex(sink.getBuffer()).should.eql "4142"

  it "acks only when data is received", future ->
    slowWriter = new stream.Writable()
    slowWriter.buffers = []
    slowWriter._write = (chunk, encoding, callback) ->
      slowWriter.buffers.push { chunk, callback }
    ps = new toolkit.QStream()
    promise = ps.pipe(slowWriter)
    flag = 0
    ps.write(new Buffer([ 0x41, 0x42, 0x43 ])).then ->
      flag.should.eql 1
      ps.close()
    Q.delay(10).then ->
      flag = 1
      slowWriter.buffers.length.should.eql 1
      slowWriter.buffers[0].chunk.toString("UTF-8").should.eql "ABC"
      slowWriter.buffers[0].callback()

  it "splices in a simple stream", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    promise = qs.pipe(sink)
    qs.write(new Buffer("siber")).then ->
      qs.spliceFrom(new toolkit.SourceStream("ian khat"))
    .then ->
      qs.write(new Buffer("ru"))
    .then ->
      qs.close()
    .then ->
      promise
    .then ->
      sink.getBuffer().toString().should.eql "siberian khatru"

  it "splices in a slow stream", future ->
    slowReader = new stream.Readable()
    slowReader._read = (n) ->
    ps = new toolkit.QStream()
    ps.write(new Buffer([ 0x41 ]))
    flag = 0
    x = ps.spliceFrom(slowReader).then ->
      flag.should.eql 1
      ps.write(new Buffer([ 0x42 ])).then ->
        ps.close()
    Q.delay(10).then ->
      flag += 1
      slowReader.push new Buffer([ 0x49 ])
      slowReader.push null
    sink = new toolkit.SinkStream()
    ps.pipe(sink).then ->
      toolkit.toHex(sink.getBuffer()).should.eql "414942"
    x
