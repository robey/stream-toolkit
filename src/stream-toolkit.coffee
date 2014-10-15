buffer_streams = require "./stream-toolkit/buffer_streams"
compound_stream = require "./stream-toolkit/compound_stream"
counting_stream = require "./stream-toolkit/counting_stream"
limit_stream = require "./stream-toolkit/limit_stream"
q_wrappers = require "./stream-toolkit/q_wrappers"
util = require "util"
weld = require "./stream-toolkit/weld"

exports.NullSinkStream = buffer_streams.NullSinkStream
exports.SinkStream = buffer_streams.SinkStream
exports.SourceStream = buffer_streams.SourceStream

exports.CompoundStream = compound_stream.CompoundStream

exports.CountingStream = counting_stream.CountingStream

exports.LimitStream = limit_stream.LimitStream

exports.pipeFromBuffer = q_wrappers.pipeFromBuffer
exports.pipeToBuffer = q_wrappers.pipeToBuffer
exports.qend = q_wrappers.qend
exports.qfinish = q_wrappers.qfinish
exports.qread = q_wrappers.qread
exports.qwrite = q_wrappers.qwrite

exports.weld = weld.weld
