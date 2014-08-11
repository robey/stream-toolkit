Q = require "q"
stream = require "stream"
util = require "util"

# Readable stream that wraps another, with a size limit.
class LimitStream extends stream.Readable
  constructor: (@stream, @size) ->
    super()
    @ready = false
    @queue = []
    @stream.on "readable", => @_readable()
    @stream.on "end", => @queue.push null
    @stream.on "error", (err) => @emit "error", err

  _readable: ->
    return if (not @ready) or @size == 0
    chunk = @stream.read()
    return if not chunk?
    overage = null
    if chunk.length > @size
      # don't unshift yet: node will just recursively trigger _readable.
      overage = chunk.slice(@size)
      chunk = chunk.slice(0, @size)
    @size -= chunk.length
    @queue.push chunk
    if @size == 0 then @queue.push null
    # okay to unshift now: if we had overage, size is 0 and our _readable callback will return immediately.
    if overage? then @stream.unshift overage
    # send immediately to the consumer if they're waiting
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

  # skip the rest of this limited stream and move on.
  skip: ->
    @read(@size)

  # returns true if the size limit has been reached.
  # this can be used to verify that all bytes were read if the stream ends.
  isFinished: ->
    @size == 0

  toString: ->
    "LimitStream(ready=#{@ready}, queue=#{util.inspect @queue}, size=#{@size}, stream=#{@stream.toString()})"


exports.LimitStream = LimitStream
