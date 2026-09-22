'use strict'

const mochaGlobals = Object.fromEntries(
  [
    'after', 'afterEach', 'before', 'beforeEach', 'context', 'describe',
    'it', 'mocha', 'run', 'setup', 'specify', 'suite', 'suiteSetup',
    'suiteTeardown', 'teardown', 'test', 'xcontext', 'xdescribe', 'xit',
    'xspecify'
  ].map(name => [name, 'readonly'])
)

const nodeGlobals = Object.fromEntries(
  [
    '__dirname', '__filename', 'AbortController', 'AbortSignal', 'atob',
    'Blob', 'BroadcastChannel', 'btoa', 'Buffer',
    'ByteLengthQueuingStrategy', 'clearImmediate', 'clearInterval',
    'clearTimeout', 'CloseEvent', 'CompressionStream', 'console',
    'CountQueuingStrategy', 'crypto', 'Crypto', 'CryptoKey', 'CustomEvent',
    'DecompressionStream', 'DOMException', 'ErrorEvent', 'Event',
    'EventTarget', 'fetch', 'File', 'FormData', 'global', 'Headers',
    'localStorage', 'Intl',
    'MessageChannel', 'MessageEvent', 'MessagePort', 'navigator',
    'Navigator', 'performance', 'Performance', 'PerformanceEntry',
    'PerformanceMark', 'PerformanceMeasure', 'PerformanceObserver',
    'PerformanceObserverEntryList', 'PerformanceResourceTiming', 'process',
    'queueMicrotask', 'QuotaExceededError', 'ReadableByteStreamController',
    'ReadableStream', 'ReadableStreamBYOBReader',
    'ReadableStreamBYOBRequest', 'ReadableStreamDefaultController',
    'ReadableStreamDefaultReader', 'Request', 'Response', 'sessionStorage',
    'setImmediate', 'setInterval', 'setTimeout', 'Storage',
    'structuredClone', 'SubtleCrypto', 'TextDecoder', 'TextDecoderStream',
    'TextEncoder', 'TextEncoderStream', 'TransformStream',
    'TransformStreamDefaultController', 'URL', 'URLPattern',
    'URLSearchParams', 'WebAssembly', 'WebSocket', 'WritableStream',
    'WritableStreamDefaultController', 'WritableStreamDefaultWriter'
  ].map(name => [name, 'readonly'])
)

module.exports = {
  nodeGlobals,
  mochaGlobals
}
