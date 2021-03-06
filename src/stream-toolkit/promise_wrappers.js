const Promise = require("bluebird");
const util = require("util");

var debugLogger = null;

function setDebugLogger(logger) {
  debugLogger = logger;
}

// add several related one-shot event handlers to an object.
// if any of these handlers is triggered, all of them are removed.
function handleOneShots(obj, handlers) {
  const wrappedHandlers = {};
  const events = Object.keys(handlers);

  events.forEach((event) => {
    const f = handlers[event];
    wrappedHandlers[event] = (...x) => {
      if (obj.__log) obj.__log("received event: " + event);
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
 * add one-shot event handlers, attached to a new promise.
 * the handler is removed once the event fires OR the promise is complete.
 * this is useful for attaching multiple events to the same promise.
 * for example, an object may emit a "data" event on success and an "error"
 * event on failure, and you'd like to merge them into one promise, and remove
 * the event handlers on the way out.
 *
 * f: (resolve, reject, onEvent) => <code>
 * onEvent(obj, eventName, handler)
 */
function untilPromise(stream, f) {
  // some gymnastics here, so we can use the new "new Promise((resolve, reject))" API.
  const handlers = [];
  const onEvent = (obj, eventName, handler) => {
    handlers.push({ obj, eventName, handler });
  }

  const promise = new Promise((resolve, reject) => {
    f(resolve, reject, onEvent);
  });

  handlers.forEach(({ obj, eventName, handler }) => {
    const h = (...x) => {
      stream.__log("received event: " + eventName);
      obj.removeListener(eventName, h);
      return handler(...x);
    }
    obj.on(eventName, h);
    promise.finally(() => obj.removeListener(eventName, h));
  });

  return promise;
}

let counter = 0;

// add promise-based methods to a stream
function promisify(stream, options = {}) {
  // only bother to add the methods once. :)
  if (stream.endPromise) return stream;

  counter += 1;
  stream.__id = counter;
  stream.__log = () => null;
  stream.__debug = false;
  if (debugLogger) {
    if (options.name) {
      stream.__name = options.name + "[" + stream.__id + "]";
    } else {
      stream.__name = "[stream " + stream.__id + "]";
    }
    stream.__log = (message) => debugLogger(stream.__name + " " + message);
    stream.__debug = true;
  }

  stream.endPromise = () => {
    stream.__log("-> end?");
    // if the stream is already closed, we won't get another "end" event, so check the stream's state.
    if (stream._readableState && (stream._readableState.endEmitted || stream._readableState.ended)) {
      stream.__log("<- end!");
      return Promise.resolve();
    }
    return untilPromise(stream, (resolve, reject, onEvent) => {
      onEvent(stream, "error", reject);
      onEvent(stream, "end", resolve);
    });
  };

  stream.finishPromise = () => {
    stream.__log("-> finish?");
    // if the stream is already closed, we won't get another "finish" event, so check the stream's state.
    if (stream._writableState && stream._writableState.finished) return Promise.resolve();
    return untilPromise(stream, (resolve, reject, onEvent) => {
      onEvent(stream, "error", reject);
      onEvent(stream, "finish", resolve);
    });
  };

  // turn a stream.read(N) into a function that returns a promise.
  stream.readPromise = (count) => {
    stream.__log("read(" + count + ")");
    if (count == 0) return Promise.resolve(new Buffer(0));
    const rv = stream.read(count);
    if (rv != null) {
      if (stream.__debug) {
        var dump = (rv instanceof Buffer) ? util.inspect(rv) : rv.toString();
        // rageface!
        if (dump == "[object Object]") dump = "[object: " + rv.constructor.name + "]";
        stream.__log("read: " + dump);
      }
      return Promise.resolve(rv);
    }
    // if the stream is closed, we won't get another "end" event, so check the stream's state.
    // node 10 uses "endEmitted"; io.js uses "ended".
    if (stream._readableState && (stream._readableState.endEmitted || stream._readableState.ended)) {
      stream.__log("read: ended");
      return Promise.resolve(rv);
    }

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
exports.setDebugLogger = setDebugLogger;
