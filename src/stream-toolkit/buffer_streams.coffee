stream = require "stream"

promise_wrappers = require "./promise_wrappers"

# simple writable stream that collects all incoming data and provides it in a single (combined) buffer.
class SinkStream extends stream.Writable
  constructor: (options) ->
    super(options)
    @buffers = []

  _write: (chunk, encoding, callback) ->
    @buffers.push chunk
    callback()

  # combine all received data into a buffer and return it. may be called multiple times.
  getBuffer: ->
    Buffer.concat(@buffers)

  # clear all received data so far.
  reset: ->
    @buffers = []


# writable stream that drains a readable by throwing away all the data.
class NullSinkStream extends stream.Writable
  constructor: (options) ->
    super(options)

  _write: (chunk, encoding, callback) ->
    callback()


# feed a readable stream from a single buffer.
class SourceStream extends stream.Readable
  constructor: (@buffer, options) ->
    super(options)

  _read: (size) ->
    @push @buffer
    @push null


sinkStream = (options) ->
  promise_wrappers.promisify(new SinkStream(options))

nullSinkStream = (options) ->
  promise_wrappers.promisify(new NullSinkStream(options))

sourceStream = (buffer, options) ->
  promise_wrappers.promisify(new SourceStream(buffer, options))

# shortcut for creating a SourceStream and piping it to a writable.
pipeFromBuffer = (buffer, writable, options) ->
  source = sourceStream(buffer)
  source.pipe(writable, options)
  source.endPromise()

# shortcut for creating a SinkStream and piping a readable into it.
pipeToBuffer = (readable, options) ->
  sink = sinkStream()
  readable.pipe(sink, options)
  sink.finishPromise().then ->
    sink.getBuffer()


exports.nullSinkStream = nullSinkStream
exports.pipeFromBuffer = pipeFromBuffer
exports.pipeToBuffer = pipeToBuffer
exports.sinkStream = sinkStream
exports.sourceStream = sourceStream
