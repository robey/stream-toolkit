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
    qs.pipe(sink)
    qs.write(new Buffer([ 0x0f ])).then ->
      qs.write(new Buffer([ 0x0d ]))
    .then ->
      qs.close()
    .then ->
      toolkit.qfinish(sink)
    .then ->
      sink.getBuffer().toString("hex").should.eql "0f0d"

  it "drains a full stream", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    promise1 = qs.write(new Buffer([ 0x41 ]))
    promise2 = qs.write(new Buffer([ 0x42 ]))
    qs.close()
    qs.pipe(sink)
    toolkit.qfinish(sink).then ->
      sink.getBuffer().toString("hex").should.eql "4142"

  it "acks only when data is received", future ->
    slowWriter = new stream.Writable()
    slowWriter.buffers = []
    slowWriter._write = (chunk, encoding, callback) ->
      slowWriter.buffers.push { chunk, callback }
    ps = new toolkit.QStream()
    ps.pipe(slowWriter)
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
    qs.pipe(sink)
    qs.write(new Buffer("siber")).then ->
      qs.spliceFrom(new toolkit.SourceStream("ian khat"))
    .then ->
      qs.write(new Buffer("ru"))
    .then ->
      qs.close()
    .then ->
      toolkit.qfinish(sink)
    .then ->
      sink.getBuffer().toString().should.eql "siberian khatru"

  it "splices in a slow stream", future ->
    slowReader = new stream.Readable()
    slowReader._read = (n) ->
    qs = new toolkit.QStream()
    qs.write(new Buffer([ 0x41 ]))
    flag = 0
    x = qs.spliceFrom(slowReader).then ->
      flag.should.eql 1
      qs.write(new Buffer([ 0x42 ])).then ->
        qs.close()
    Q.delay(10).then ->
      flag += 1
      slowReader.push new Buffer([ 0x49 ])
      slowReader.push null
    sink = new toolkit.SinkStream()
    qs.pipe(sink)
    toolkit.qend(sink).then ->
      sink.getBuffer().toString("hex").should.eql "414942"
    x

  it "splices in a LimitStream", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    qs.pipe(sink)
    slowReader = new stream.Readable()
    slowReader._read = (n) ->
    promise = qs.spliceFrom(new toolkit.LimitStream(slowReader, 5)).then ->
      qs.close()
    slowReader.push new Buffer("television")
    Q.all([ toolkit.qfinish(sink), promise ]).then ->
      sink.getBuffer().toString().should.eql "telev"

  it "splices in a nested QStream", future ->
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    qs.pipe(sink)
    qs2 = new toolkit.QStream()
    promise = qs.spliceFrom(new toolkit.LimitStream(qs2, 5)).then ->
      qs.close()
    qs2.write(new Buffer("hello")).then ->
      qs2.close()
    .then ->
      Q.all([ toolkit.qfinish(sink), promise ]).then ->
        sink.getBuffer().toString().should.eql "hello"

  it "splices in a transformed stream", future ->
    source = new stream.Readable()
    source._read = ->
      Q.delay(100).then ->
        source.push new Buffer("hi")
        source.push null
    transformed = new stream.Transform()
    transformed._transform = (buffer, _, callback) ->
      transformed.push(buffer)
      callback()
    source.pipe(transformed)
    sink = new toolkit.SinkStream()
    qs = new toolkit.QStream()
    qs.pipe(sink)
    qs.spliceFrom(transformed).then ->
      sink.getBuffer().toString().should.eql "hi"
