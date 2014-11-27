Promise = require "bluebird"
util = require "util"

# add several related one-shot event handlers to an object.
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

# add promise-based methods to a stream
promisify = (stream) ->
  stream.endPromise = ->
    # if the stream is already closed, we won't get another "end" event, so check the stream's state.
    if stream._readableState?.endEmitted then return Promise.resolve()
    deferred = Promise.defer()
    untilPromise deferred.promise, stream, "error", (error) ->
      deferred.reject(error)
    untilPromise deferred.promise, stream, "end", ->
      deferred.resolve()
    deferred.promise

  stream.finishPromise = ->
    # if the stream is already closed, we won't get another "finish" event, so check the stream's state.
    if stream._writableState.finished then return Promise.resolve()
    deferred = Promise.defer()
    untilPromise deferred.promise, stream, "error", (error) ->
      deferred.reject(error)
    untilPromise deferred.promise, stream, "finish", ->
      deferred.resolve()
    deferred.promise

  # turn a stream.read(N) into a function that returns a promise.
  stream.readPromise = (count) ->
    if count == 0 then return Promise.resolve(new Buffer(0))
    rv = stream.read(count)
    # if the stream is closed, we won't get another "end" event, so check the stream's state.
    if rv? or stream._readableState?.endEmitted then return Promise.resolve(rv)

    deferred = Promise.defer()
    handleOneShots stream,
      readable: -> deferred.resolve(stream.readPromise(count))
      error: (error) -> deferred.reject(error)
      end: -> deferred.resolve(null)
    deferred.promise

  # turn stream.write(data) into a function that returns a promise.
  stream.writePromise = (data, encoding) ->
    deferred = Promise.defer()
    callback = (error) ->
      if error? then deferred.reject(error) else deferred.resolve()
    stream.write(data, encoding, callback)
    deferred.promise

  stream


exports.promisify = promisify
