Q = require "q"
stream = require "stream"
util = require "util"

# Readable stream that enqueues data pushed into it. For each write, it
# returns a promise that will be fulfilled when the buffer is received
# downsteam. (You can use this to avoid generating more data until all the
# previous data has been received, effectively nullifying buffering.)
class QStream extends stream.Readable
  constructor: ->
    super()
    @closed = false
    @ready = false
    @queue = []
    @spliced = null

  # push out any data we have buffered up.
  # node uses this as the "unpause" signal. the "pause" signal is returning false from a @push call.
  _read: (n) ->
    @ready = true
    @_drain()

  # write a buffer into the stream.
  # returns a promise that will resolve when the data is received downstream.
  write: (buffer) ->
    if @closed and buffer? then throw new Error("You've already closed this stream")
    deferred = Q.defer()
    @queue.push { buffer, deferred }
    if @ready then @_drain()
    deferred.promise

  # close the stream and signal any readers.
  close: ->
    return if @closed
    @closed = true
    @write(null)

  _drain: ->
    while @ready and @queue.length > 0
      { buffer, deferred } = @queue.shift()
      @ready = @push buffer
      deferred.resolve()
    if @ready and @spliced? then @_feedFromSplice()

  _feedFromSplice: ->
    return if (not @ready) or @closed
    chunk = @spliced.read()
    return if not chunk?
    @write chunk

  # pipe this into a writable, and return a promise that will resolve when the pipe is finished.
  pipe: (writable) ->
    deferred = Q.defer()
    writable.once "finish", ->
      deferred.resolve()
    writable.once "error", (err) ->
      deferred.reject(err)
    # no better way to do this? :(
    QStream.__super__.pipe.apply(@, [ writable ])
    deferred.promise

  # splice another stream into this one.
  # returns a promise that is fulfilled when the inner stream is finished.
  # the QStream will remain open for further data until closed explicitly.
  spliceFrom: (inStream) ->
    if @spliced? then throw new Error("Already splicing!")
    @spliced = inStream
    deferred = Q.defer()
    inStream.on "readable", => @_feedFromSplice()
    inStream.once "error", (err) =>
      return unless @spliced?
      @spliced = null
      deferred.reject(err)
    inStream.once "end", =>
      return unless @spliced?
      @spliced = null
      @write(new Buffer(0)).then -> deferred.resolve()
    deferred.promise


exports.QStream = QStream
