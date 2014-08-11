mocha_sprinkles = require "mocha-sprinkles"
Q = require "q"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "CompoundStream", ->
  it "combines several streams", (done) ->
    sink = new toolkit.SinkStream()
    source1 = new toolkit.SourceStream("hello ")
    source2 = new toolkit.SourceStream("sailor")
    source3 = new toolkit.SourceStream("!")
    s = new toolkit.CompoundStream([ source1, source2, source3 ])
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "generates new streams on demand", (done) ->
    sink = new toolkit.SinkStream()
    source1 = new toolkit.SourceStream("hello ")
    source2 = new toolkit.SourceStream("sailor")
    source3 = new toolkit.SourceStream("!")
    state = 0
    generator = ->
      state += 1
      switch state
        when 1 then source1
        when 2 then source2
        when 3 then source3
        else null
    s = new toolkit.CompoundStream(generator)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "can re-join several LimitStreams", (done) ->
    source = new toolkit.SourceStream("hello sailor!")
    sink = new toolkit.SinkStream()
    state = 0
    generator = ->
      state += 1
      switch state
        when 1 then new toolkit.LimitStream(source, 5)
        when 2 then new toolkit.LimitStream(source, 3)
        when 3 then new toolkit.LimitStream(source, 5)
        else null
    s = new toolkit.CompoundStream(generator)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "combines streams from promises", (done) ->
    sink = new toolkit.SinkStream()
    deferred1 = Q.defer()
    deferred2 = Q.defer()
    s = new toolkit.CompoundStream([ deferred1.promise, deferred2.promise ])
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()
    Q.delay(10).then ->
      deferred1.resolve(new toolkit.SourceStream("hello "))
      Q.delay(50)
    .then ->
      deferred2.resolve(new toolkit.SourceStream("sailor!"))
