buffer_streams = require "./stream-toolkit/buffer_streams"
compound_stream = require "./stream-toolkit/compound_stream"
limit_stream = require "./stream-toolkit/limit_stream"
push_stream = require "./stream-toolkit/push_stream"

pad0 = (s, n) ->
  while s.length < n then s = "0" + s
  s

toHex = (buffer) ->
  # can't map across a buffer, even tho it supports operator[] :(
  [0 ... buffer.length].map((n) -> pad0(buffer[n].toString(16), 2)).join("")

fromHex = (str) ->
  new Buffer([0 ... str.length / 2].map (i) -> parseInt(str[i * 2 ... (i + 1) * 2], 16))


exports.fromHex = fromHex
exports.CompoundStream = compound_stream.CompoundStream
exports.LimitStream = limit_stream.LimitStream
exports.PushStream = push_stream.PushStream
exports.SinkStream = buffer_streams.SinkStream
exports.SourceStream = buffer_streams.SourceStream
exports.toHex = toHex
