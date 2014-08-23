Q = require "q"

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
  cleanup = -> obj.removeListener(eventName, h)
  promise.then(cleanup, cleanup)

# return a promise that will be fulfilled when a readable stream ends.
qend = (stream) ->
  # if the stream is already closed, we won't get another "end" event, so check the stream's state.
  if stream._readableState.ended then return Q()
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "error", (err) ->
    deferred.reject(err)
  untilPromise deferred.promise, stream, "end", ->
    deferred.resolve()
  deferred.promise

# return a promise that will be fulfilled when a writable stream is finished.
qfinish = (stream) ->
  # if the stream is already closed, we won't get another "finish" event, so check the stream's state.
  if stream._writableState.finished then return Q()
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "error", (err) ->
    deferred.reject(err)
  untilPromise deferred.promise, stream, "finish", ->
    deferred.resolve()
  deferred.promise

# shortcut for pipe + qend: return a promise that will be fulfilled when the pipe is finished.
qpipe = (readable, writable, options) ->
  readable.pipe(writable, options)
  qend(readable)

# turn a stream.read(N) into a function that returns a promise.
qread = (stream, count) ->
  if count == 0 then return Q(new Buffer(0))
  rv = stream.read(count)
  # if the stream is closed, we won't get another "end" event, so check the stream's state.
  if rv? or stream._readableState.ended then return Q(rv)
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "readable", ->
    qread(stream, count).then (rv) ->
      deferred.resolve(rv)
  untilPromise deferred.promise, stream, "error", (err) ->
    deferred.reject(err)
  untilPromise deferred.promise, stream, "end", ->
    deferred.resolve(null)
  deferred.promise


exports.qend = qend
exports.qfinish = qfinish
exports.qpipe = qpipe
exports.qread = qread
