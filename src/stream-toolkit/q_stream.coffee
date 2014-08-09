Q = require "q"
stream = require "stream"

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

  # splice data from another readable stream into this one. if byteCount is defined, demand exactly that many bytes.
  spliceFrom: (inStream, byteCount) ->
    if @spliced? then throw new Error("Already shunting!")
    @spliced = inStream
    deferred = Q.defer()
    lastPromise = Q()
    inStream.on "data", (chunk) =>
      return unless @spliced?
      buffer = if byteCount? and chunk.length > byteCount then chunk.slice(0, byteCount) else chunk
      if byteCount? then byteCount -= buffer.length
      lastPromise = @write(buffer)
      if byteCount? and byteCount == 0
        @spliced = null
        lastPromise.then => deferred.resolve()
    inStream.once "error", (err) =>
      return unless @spliced?
      @spliced = null
      deferred.reject(err)
    inStream.once "end", =>
      return unless @spliced?
      @spliced = null
      if byteCount? and byteCount > 0
        deferred.reject(new Error("Insufficient data from pipe (needed #{remaining} more)"))
        return
      lastPromise.then => deferred.resolve()
    deferred.promise


exports.QStream = QStream
