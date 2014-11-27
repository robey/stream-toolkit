stream = require "stream"
util = require "util"

# join a series of streams together with `pipe`, and then return a stream
# that writes to the start and reads from the end. for example:
# 
#     weld(a, b, c)
#
# does `a.pipe(b)` and `b.pipe(c)`, and returns a stream that writes into
# `a` and reads from `c`.
weld = (streams...) ->
  for i in [1 ... streams.length] then streams[i - 1].pipe(streams[i])
  first = streams[0]
  last = streams[streams.length - 1]
  rv = new stream.Transform()
  rv._transform = (data, encoding, callback) ->
    first.write(data, encoding, callback)
  rv._flush = (callback) ->
    last.on "end", -> callback()
    first.end()
  last.on "data", (data) -> rv.push data
  rv
  

exports.weld = weld
