mocha_sprinkles = require "mocha-sprinkles"
stream = require "stream"
util = require "util"

toolkit = require "../lib/stream-toolkit"

future = mocha_sprinkles.future

capitalizer = new stream.Transform()
capitalizer._transform = (data, _, callback) ->
  capitalizer.push new Buffer(data.toString().toUpperCase())
  callback()

prefixer = new stream.Transform()
prefixer._transform = (data, _, callback) ->
  prefixer.push data
  callback()
prefixer.push new Buffer("<<")

suffixer = new stream.Transform()
suffixer._transform = (data, _, callback) ->
  suffixer.push data
  callback()
suffixer._flush = (callback) ->
  suffixer.push new Buffer(">>")
  callback()
 
describe "weld", ->
  it "welds a few streams together", future ->
    source = toolkit.sourceStream("hello sailor!")
    s = toolkit.weld(capitalizer, prefixer, suffixer)
    source.pipe(s)
    toolkit.pipeToBuffer(s).then (buffer) ->
      buffer.toString().should.eql "<<HELLO SAILOR!>>"
