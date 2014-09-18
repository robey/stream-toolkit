Q = require "q"
util = require "util"

buffer_streams = require "./buffer_streams"

# add several one-shot event handlers to an object.
# if any of these handlers is triggered, all of them are removed.
handleOneShots = (obj, handlers) ->
  wrappedHandlers = {}
  for k, f of handlers then do (k, f) ->
    wrappedHandlers[k] = (x...) ->
      removeWrappedHandlers()
      f(x...)
  removeWrappedHandlers = ->
    for k, f of wrappedHandlers then obj.removeListener(k, f)
  for k, f of wrappedHandlers then obj.on k, f

# add a one-shot handler to an event.
# the handler is removed once the event fires OR a promise is resolved.
# this is useful for attaching multiple events to the same promise.
# for example, an object may emit a "data" event on success and an "error"
# event on failure, and you'd like to merge them into one promise.
untilPromise = (promise, obj, eventName, handler) ->
  h = (x...) ->
    obj.removeListener(eventName, h)
    handler(x...)
  obj.on eventName, h
  promise.finally ->
    obj.removeListener(eventName, h)

# return a promise that will be fulfilled when a readable stream ends.
qend = (stream) ->
  # if the stream is already closed, we won't get another "end" event, so check the stream's state.
  if stream._readableState?.endEmitted then return Q()
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "error", (error) ->
    deferred.reject(error)
  untilPromise deferred.promise, stream, "end", ->
    deferred.resolve()
  deferred.promise

# return a promise that will be fulfilled when a writable stream is finished.
qfinish = (stream) ->
  # if the stream is already closed, we won't get another "finish" event, so check the stream's state.
  if stream._writableState.finished then return Q()
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "error", (error) ->
    deferred.reject(error)
  untilPromise deferred.promise, stream, "finish", ->
    deferred.resolve()
  deferred.promise

# turn a stream.read(N) into a function that returns a promise.
qread = (stream, count) ->
  if count == 0 then return Q(new Buffer(0))
  rv = stream.read(count)
  # if the stream is closed, we won't get another "end" event, so check the stream's state.
  if rv? or stream._readableState?.endEmitted then return Q(rv)

  deferred = Q.defer()
  handleOneShots stream,
    readable: -> deferred.resolve(qread(stream, count))
    error: (error) -> deferred.reject(error)
    end: -> deferred.resolve(null)
  deferred.promise

# turn stream.write(data) into a function that returns a promise.
qwrite = (stream, data, encoding) ->
  deferred = Q.defer()
  callback = (error) ->
    if error? then deferred.reject(error) else deferred.resolve()
  stream.write(data, encoding, callback)
  deferred.promise

# shortcut for creating a SourceStream and piping it to a writable.
pipeFromBuffer = (buffer, writable, options) ->
  source = new buffer_streams.SourceStream(buffer)
  source.pipe(writable, options)
  qend(source)

# shortcut for creating a SinkStream and piping a readable into it.
pipeToBuffer = (readable, options) ->
  sink = new buffer_streams.SinkStream()
  readable.pipe(sink, options)
  qfinish(sink).then ->
    sink.getBuffer()


exports.qend = qend
exports.qfinish = qfinish
exports.pipeFromBuffer = pipeFromBuffer
exports.pipeToBuffer = pipeToBuffer
exports.qread = qread
exports.qwrite = qwrite
