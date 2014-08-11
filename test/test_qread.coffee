mocha_sprinkles = require "mocha-sprinkles"
Q = require "q"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "qread", ->
  it "works on a pre-filled stream", future ->
    source = new toolkit.SourceStream("hello")
    toolkit.qread(source, 5).then (buffer) ->
      buffer.toString().should.eql "hello"

  it "works on a delayed stream", future ->
    s = new stream.Readable()
    s._read = ->
    promise = toolkit.qread(s, 5)
    Q.delay(50).then ->
      s.push "hi"
      Q.delay(50)
    .then ->
      s.push " there."
      promise
    .then (buffer) ->
      buffer.toString().should.eql "hi th"

  it "handles a close event", future ->
    s = new stream.Readable()
    s._read = ->
    promise = toolkit.qread(s, 5)
    Q.delay(50).then ->
      s.push "hi"
      s.push null
      promise
    .then (buffer) ->
      buffer.toString().should.eql "hi"
