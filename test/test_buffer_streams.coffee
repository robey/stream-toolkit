should = require "should"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

describe "SinkStream", ->
  it "collects data as it's written", (done) ->
    sink = toolkit.sinkStream()
    sink.on "finish", ->
      sink.getBuffer().toString("UTF-8").should.eql "hello there!"
      done()
    source = new stream.Readable()
    source._read = ->
    source.push new Buffer("hello ", "UTF-8")
    source.push new Buffer("there!", "UTF-8")
    source.push null
    source.pipe(sink)

describe "SourceStream", ->
  it "sends data", ->
    source = toolkit.sourceStream("hello sailor")
    source.read(5).toString("UTF-8").should.eql "hello"
    source.read(7).toString("UTF-8").should.eql " sailor"
    (source.read()?).should.eql false

describe "NullSinkStream", ->
  it "throws away data", (done) ->
    source = toolkit.sourceStream("hello sailor")
    sink = toolkit.nullSinkStream()
    source.pipe(sink)
    source.on "end", -> done()
    
