const Promise = require("bluebird");
const util = require("util");

// add several related one-shot event handlers to an object.
// if any of these handlers is triggered, all of them are removed.
function handleOneShots(obj, handlers) {
  const wrappedHandlers = {};
  const events = Object.keys(handlers);

  events.forEach((event) => {
    const f = handlers[event];
    wrappedHandlers[event] = (...x) => {
      removeWrappedHandlers();
      return f(...x);
    };
  });

  function removeWrappedHandlers() {
    events.map((event) => obj.removeListener(event, wrappedHandlers[event]));
  }

  events.map((event) => obj.on(event, wrappedHandlers[event]));
}

/*
 * add a one-shot handler to an event.
 * the handler is removed once the event fires OR a promise is resolved.
 * this is useful for attaching multiple events to the same promise.
 * for example, an object may emit a "data" event on success and an "error"
 * event on failure, and you'd like to merge them into one promise.
 */
function untilPromise(promise, obj, eventName, handler) {
  function h(...x) {
    obj.removeListener(eventName, h);
    return handler(...x);
  }
  obj.on(eventName, h);
  promise.finally(() => obj.removeListener(eventName, h));
}

// add promise-based methods to a stream
function promisify(stream) {
  // only bother to add the methods once. :)
  if (stream.endPromise) return stream;

  stream.endPromise = () => {
    // if the stream is already closed, we won't get another "end" event, so check the stream's state.
    if (stream._readableState && stream._readableState.endEmitted) return Promise.resolve();
    const deferred = Promise.defer();
    untilPromise(deferred.promise, stream, "error", (error) => deferred.reject(error));
    untilPromise(deferred.promise, stream, "end", () => deferred.resolve());
    return deferred.promise;
  };

  stream.finishPromise = () => {
    // if the stream is already closed, we won't get another "finish" event, so check the stream's state.
    if (stream._writableState && stream._writableState.finished) return Promise.resolve();
    const deferred = Promise.defer();
    untilPromise(deferred.promise, stream, "error", (error) => deferred.reject(error));
    untilPromise(deferred.promise, stream, "finish", () => deferred.resolve());
    return deferred.promise;
  };

  // turn a stream.read(N) into a function that returns a promise.
  stream.readPromise = (count) => {
    if (count == 0) return Promise.resolve(new Buffer(0));
    const rv = stream.read(count);
    // if the stream is closed, we won't get another "end" event, so check the stream's state.
    if (rv != null || (stream._readableState && stream._readableState.endEmitted)) return Promise.resolve(rv);

    const deferred = Promise.defer();
    handleOneShots(stream, {
      readable: () => deferred.resolve(stream.readPromise(count)),
      error: (error) => deferred.reject(error),
      end: () => deferred.resolve(null)
    });
    return deferred.promise;
  };

  // turn stream.write(data) into a function that returns a promise.
  stream.writePromise = (data, encoding) => {
    return new Promise((resolve, reject) => {
      stream.write(data, encoding, (error) => error ? reject(error) : resolve());
    });
  };

  return stream;
}


exports.promisify = promisify;
