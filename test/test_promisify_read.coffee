mocha_sprinkles = require "mocha-sprinkles"
Promise = require "bluebird"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

describe "readPromise", ->
  it "works on a pre-filled stream", future ->
    source = toolkit.sourceStream("hello")
    source.readPromise(5).then (buffer) ->
      buffer.toString().should.eql "hello"

  it "works on a delayed stream", future ->
    s = toolkit.promisify(new stream.Readable())
    s._read = ->
    promise = s.readPromise(5)
    Promise.delay(50).then ->
      s.push "hi"
      Promise.delay(50)
    .then ->
      s.push " there."
      promise
    .then (buffer) ->
      buffer.toString().should.eql "hi th"

  it "handles a close event", future ->
    s = toolkit.promisify(new stream.Readable())
    s._read = ->
    promise = s.readPromise(5)
    Promise.delay(50).then ->
      s.push "hi"
      s.push null
      promise
    .then (buffer) ->
      buffer.toString().should.eql "hi"
