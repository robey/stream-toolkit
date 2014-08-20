buffer_streams = require "./stream-toolkit/buffer_streams"
compound_stream = require "./stream-toolkit/compound_stream"
limit_stream = require "./stream-toolkit/limit_stream"
q_stream = require "./stream-toolkit/q_stream"
util = require "util"

pad0 = (s, n) ->
  while s.length < n then s = "0" + s
  s

toHex = (buffer) ->
  # can't map across a buffer, even tho it supports operator[] :(
  [0 ... buffer.length].map((n) -> pad0(buffer[n].toString(16), 2)).join("")

fromHex = (str) ->
  new Buffer([0 ... str.length / 2].map (i) -> parseInt(str[i * 2 ... (i + 1) * 2], 16))

Q = require "q"

untilPromise = (promise, obj, event, handler) ->
  obj.once event, handler
  cleanup = -> obj.removeListener(event, handler)
  promise.then(cleanup, cleanup)

qpipe = (readable, writable, options) ->
  deferred = Q.defer()
  untilPromise deferred.promise, writable, "finish", ->
    deferred.resolve()
  untilPromise deferred.promise, writable, "error", (err) ->
    deferred.reject(err)
  readable.pipe(writable, options)
  deferred.promise

# turn a stream.read(N) into a function that returns a promise.
qread = (stream, count) ->
  if count == 0 then return Q(new Buffer(0))
  rv = stream.read(count)
  # if the stream is closed, we won't get another "end" event, so check the stream's state
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

# return a promise that will be fulfilled when this stream ends.
qend = (stream) ->
  # if the stream is closed, we won't get another "end" event, so check the stream's state
  if stream._readableState.ended then return Q()
  deferred = Q.defer()
  untilPromise deferred.promise, stream, "error", (err) ->
    deferred.reject(err)
  untilPromise deferred.promise, stream, "end", ->
    deferred.resolve()
  deferred.promise


exports.fromHex = fromHex
exports.qend = qend
exports.qpipe = qpipe
exports.qread = qread
exports.CompoundStream = compound_stream.CompoundStream
exports.LimitStream = limit_stream.LimitStream
exports.NullSinkStream = buffer_streams.NullSinkStream
exports.QStream = q_stream.QStream
exports.SinkStream = buffer_streams.SinkStream
exports.SourceStream = buffer_streams.SourceStream
exports.toHex = toHex
