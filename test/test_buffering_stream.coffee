should = require "should"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

describe "BufferingStream", ->
  it "buffers data", (done) ->
    b = new toolkit.BlockBufferingStream(bufferSize: 10)
    collected = []
    b._transformBuffer = (buffers, callback) ->
      b.push Buffer.concat(buffers)
      callback()
    b.on "data", (data) -> collected.push data.toString()
    b.write new Buffer("hello")
    b.write new Buffer("again")
    b.write new Buffer("third")
    b.on "end", ->
      collected.should.eql [ "helloagain", "third" ]
      done()
    b.end()

  it "flushes at the end", (done) ->
    b = new toolkit.BlockBufferingStream(bufferSize: 100)
    collected = []
    b._transformBuffer = (buffers, callback) ->
      b.push Buffer.concat(buffers)
      callback()
    b._flushBuffer = (buffers, callback) ->
      b.push new Buffer("***")
      b.push Buffer.concat(buffers)
      callback()
    b.on "data", (data) -> collected.push data.toString()
    b.write new Buffer("hello")
    b.write new Buffer("again")
    b.write new Buffer("third")
    b.on "end", ->
      collected.should.eql [ "***", "helloagainthird" ]
      done()
    b.end()
