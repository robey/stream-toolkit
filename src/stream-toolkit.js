const buffer_streams = require("./stream-toolkit/buffer_streams");
const compound_stream = require("./stream-toolkit/compound_stream");
const counting_stream = require("./stream-toolkit/counting_stream");
const limit_stream = require("./stream-toolkit/limit_stream");
const promise_wrappers = require("./stream-toolkit/promise_wrappers");
const weld = require("./stream-toolkit/weld");

exports.nullSinkStream = buffer_streams.nullSinkStream;
exports.sinkStream = buffer_streams.sinkStream;
exports.pipeFromBuffer = buffer_streams.pipeFromBuffer;
exports.pipeToBuffer = buffer_streams.pipeToBuffer;
exports.sourceStream = buffer_streams.sourceStream;

exports.compoundStream = compound_stream.compoundStream

exports.countingStream = counting_stream.countingStream;

exports.limitStream = limit_stream.limitStream;

exports.promisify = promise_wrappers.promisify;

exports.weld = weld.weld;
