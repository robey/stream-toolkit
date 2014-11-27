mocha_sprinkles = require "mocha-sprinkles"
Promise = require "bluebird"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "LimitStream", ->
  it "stops before the end", (done) ->
    sink = toolkit.sinkStream()
    source = toolkit.sourceStream("hello sailor")
    s = toolkit.limitStream(source, 10)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sail"
      s.isFinished().should.eql true
      source.read().toString().should.eql "or"
      done()

  it "notices if there's not enough data", (done) ->
    sink = toolkit.sinkStream()
    source = toolkit.sourceStream("hello")
    s = toolkit.limitStream(source, 10)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello"
      s.isFinished().should.eql false
      (source.read()?).should.eql false
      done()

  it "reacts correctly to slow data", future ->
    sink = toolkit.sinkStream()
    source = new stream.Readable()
    source._read = ->
    s = toolkit.limitStream(source, 10)
    s.pipe(sink)
    deferred = Promise.defer()
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sail"
      s.isFinished().should.eql true
      source.read().toString().should.eql "or"
      deferred.resolve()
    Promise.delay(10).then ->
      source.push new Buffer("hello")
      Promise.delay(10).then ->
        source.push new Buffer(" sailor")
    .then ->
      deferred.promise

  it "can be chained", (done) ->
    sink1 = toolkit.sinkStream()
    source = toolkit.sourceStream("hello sailor!")
    s = toolkit.limitStream(source, 4)
    s.pipe(sink1)
    sink1.on "finish", ->
      sink2 = toolkit.sinkStream()
      s = toolkit.limitStream(source, 4)
      s.pipe(sink2)
      sink2.on "finish", ->
        sink1.getBuffer().toString().should.eql "hell"
        sink2.getBuffer().toString().should.eql "o sa"
        source.read().toString().should.eql "ilor!"
        done()

  it "can be nested", (done) ->
    sink = toolkit.sinkStream()
    source = toolkit.sourceStream("hello sailor!")
    s1 = toolkit.limitStream(source, 10)
    s1.read(2).toString().should.eql "he"
    s2 = toolkit.limitStream(s1, 5)
    s2.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "llo s"
      s1.read(10).toString().should.eql "ail"
      done()

  it "handles the stupid 0-length case", (done) ->
    sink = toolkit.sinkStream()
    source = toolkit.sourceStream("hello sailor!")
    s = toolkit.limitStream(source, 0)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql ""
      s.isFinished().should.eql true
      done()
