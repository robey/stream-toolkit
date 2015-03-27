mocha_sprinkles = require "mocha-sprinkles"
Promise = require "bluebird"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "CompoundStream", ->
  it "combines several streams", (done) ->
    sink = toolkit.sinkStream()
    source1 = toolkit.sourceStream("hello ")
    source2 = toolkit.sourceStream("sailor")
    source3 = toolkit.sourceStream("!")
    s = toolkit.compoundStream([ source1, source2, source3 ])
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "generates new streams on demand", (done) ->
    sink = toolkit.sinkStream()
    source1 = toolkit.sourceStream("hello ")
    source2 = toolkit.sourceStream("sailor")
    source3 = toolkit.sourceStream("!")
    state = 0
    generator = ->
      state += 1
      switch state
        when 1 then source1
        when 2 then source2
        when 3 then source3
        else null
    s = toolkit.compoundStream(generator)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "can re-join several LimitStreams", (done) ->
    source = toolkit.sourceStream("hello sailor!")
    sink = toolkit.sinkStream()
    state = 0
    generator = ->
      state += 1
      switch state
        when 1 then toolkit.limitStream(source, 5)
        when 2 then toolkit.limitStream(source, 3)
        when 3 then toolkit.limitStream(source, 5)
        else null
    s = toolkit.compoundStream(generator)
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()

  it "combines streams from promises", (done) ->
    sink = toolkit.sinkStream()
    deferred1 = Promise.defer()
    deferred2 = Promise.defer()
    s = toolkit.compoundStream([ deferred1.promise, deferred2.promise ])
    s.pipe(sink)
    sink.on "finish", ->
      sink.getBuffer().toString().should.eql "hello sailor!"
      done()
    Promise.delay(10).then ->
      deferred1.resolve(toolkit.sourceStream("hello "))
      Promise.delay(50)
    .then ->
      deferred2.resolve(toolkit.sourceStream("sailor!"))
