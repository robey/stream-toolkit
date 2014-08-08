mocha_sprinkles = require "mocha-sprinkles"
Q = require "q"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "LimitStream", ->
  it "stops before the end", (done) ->
    sink = new toolkit.SinkStream()
    source = new toolkit.SourceStream("hello sailor")
    s = new toolkit.LimitStream(source, 10)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sail"
      s.isFinished().should.eql true
      source.read().toString().should.eql "or"
      done()

  it "notices if there's not enough data", (done) ->
    sink = new toolkit.SinkStream()
    source = new toolkit.SourceStream("hello")
    s = new toolkit.LimitStream(source, 10)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello"
      s.isFinished().should.eql false
      (source.read()?).should.eql false
      done()

  it "reacts correctly to slow data", future ->
    sink = new toolkit.SinkStream()
    source = new stream.Readable()
    source._read = ->
    s = new toolkit.LimitStream(source, 10)
    s.pipe(sink)
    deferred = Q.defer()
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sail"
      s.isFinished().should.eql true
      source.read().toString().should.eql "or"
      deferred.resolve()
    Q.delay(10).then ->
      source.push new Buffer("hello")
      Q.delay(10).then ->
        source.push new Buffer(" sailor")
    .then ->
      deferred.promise

  it "can be chained", (done) ->
    sink1 = new toolkit.SinkStream()
    source = new toolkit.SourceStream("hello sailor!")
    s = new toolkit.LimitStream(source, 4)
    s.pipe(sink1)
    sink1.on "finish", ->
      sink2 = new toolkit.SinkStream()
      s = new toolkit.LimitStream(source, 4)
      s.pipe(sink2)
      sink2.on "finish", ->
        sink1.getBuffer().toString().should.eql "hell"
        sink2.getBuffer().toString().should.eql "o sa"
        source.read().toString().should.eql "ilor!"
        done()

  it "can be nested", (done) ->
    sink = new toolkit.SinkStream()
    source = new toolkit.SourceStream("hello sailor!")
    s1 = new toolkit.LimitStream(source, 10)
    s1.read(2).toString().should.eql "he"
    s2 = new toolkit.LimitStream(s1, 5)
    s2.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "llo s"
      s1.read(10).toString().should.eql "ail"
      done()
