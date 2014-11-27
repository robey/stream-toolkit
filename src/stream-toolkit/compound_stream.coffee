Promise = require "bluebird"
stream = require "stream"
util = require "util"

promise_wrappers = require "./promise_wrappers"

# Readable stream composed from a series of smaller streams.
# Generator is a function that returns each new stream in sequence, either
# directly or as a promise. When it returns null, the compound stream ends
# too. (Generator may also be an array, if you have a set of streams already.)
class CompoundStream extends stream.Readable
  constructor: (@generator) ->
    super()
    @closed = false
    @ready = false
    @queue = []
    @stream = null
    @_next()

  _next: ->
    Promise.resolve(if Array.isArray(@generator) then @generator.shift() else @generator()).then (s) =>
      if not s? then return @_done()
      @stream = s
      s.on "readable", => @_readable()
      s.on "end", => @_next()
      s.on "error", (err) => @emit "error", err
      @_readable()
    .catch (err) =>
      @emit "error", err

  _readable: ->
    return if (not @ready) or @closed or (not @stream?)
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


compoundStream = (generator) ->
  promise_wrappers.promisify(new CompoundStream(generator))


exports.compoundStream = compoundStream
