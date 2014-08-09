Q = require "q"
stream = require "stream"
util = require "util"

# Readable stream composed from a series of smaller streams.
# Generator is a function that returns each new stream in sequence. When it
# returns null, the compound stream ends too. (Generator may also be an
# array, if you have a set of streams already.)
class CompoundStream extends stream.Readable
  constructor: (@generator) ->
    super()
    @closed = false
    @ready = false
    @queue = []
    @stream = null
    @_next()

  _next: ->
    if Array.isArray(@generator)
      if @generator.length == 0 then return @_done()
      @stream = @generator.shift()
    else
      @stream = @generator()
      if not @stream? then return @_done()
    @stream.on "readable", => @_readable()
    @stream.on "end", => @_next()
    @stream.on "error", (err) => @emit "error", err

  _readable: ->
    return if (not @ready) or @closed
    chunk = @stream.read()
    return if not chunk?
    @queue.push chunk
    @_drain()

  # push out any data we have buffered up.
  # node uses this as the "unpause" signal. the "pause" signal is returning false from a @push call.
  _read: (n) ->
    @ready = true
    @_drain()

  _drain: ->
    while @ready and @queue.length > 0
      @ready = @push @queue.shift()
    # if the consumer is still hungry for more, see if a read() will pull out any more
    if @ready then @_readable()

  _done: ->
    @queue.push null
    @closed = true
    @_drain()


exports.CompoundStream = CompoundStream
