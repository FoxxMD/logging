# @foxxmd/logging

[![Latest Release](https://img.shields.io/github/v/release/foxxmd/logging)](https://github.com/FoxxMD/logging/releases)
![NPM Version](https://img.shields.io/npm/v/%40foxxmd%2Flogging)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A typed, opinionated, batteries-included, [Pino](https://getpino.io)-based logging solution for backend TS/JS projects.

Features:

* Fully typed for Typescript projects
* One-line, turn-key logging to console and rotating file
* Child (nested) loggers with hierarchical label prefixes for log messages
* Per-destination level filtering configurable via ENV or arguments
* Clean, opinionated log output format powered by [pino-pretty](https://github.com/pinojs/pino-pretty):
  * Standard timestamp (iso8601)
  * Colorized output when stream is TTY and supports it
  * Automatically serialize passed objects and Errors, including [Error Cause](https://github.com/tc39/proposal-error-cause)
* Bring-Your-Own settings
  * Add or use your own streams for destinations
  * All pino-pretty configs are exposed and extensible

<img src="/example/example.png"
alt="log output example" height="500">

# Install

```
npm install @foxxmd/logging
```

# Quick Start

```ts
import { loggerAppRolling, loggerApp } from "@foxxmd/logging";

const logger = loggerApp();
logger.info('Test');
/*
 * Logs to -> console, colorized
 * Logs to -> CWD/logs/app.log
 * 
 * [2024-03-07 10:31:34.963 -0500] DEBUG: Test
 * */


// or for rolling log files we need to scan logs dir before opening a file
// and need to await initial logger
const rollingLogger = await loggerAppRolling();
rollingLogger.info('Test');
/*
 * Logs to -> console, colorized
 * Logs to daily log file, max 10MB size -> CWD/logs/app.1.log
 * 
 * [2024-03-07 10:31:34.963 -0500] DEBUG: Test
 * */
```

# Loggers

The package exports 4 top-level loggers.

### App Loggers

These are the loggers that should be used for the majority of your application. They accept an optional configuration object for configuring log destinations.

* `loggerApp` - Logs to console and a fixed file destination
* `loggerAppRolling` - Logs to console and a rolling file destination

### Helper Loggers

These loggers are pre-defined for specific use cases:

* `loggerDebug` - Logs ONLY to console at minimum `debug` level. Can be used during application startup before a logger app configuration has been parsed.
* `loggerTest` - A noop logger (will not log anywhere) for use in tests/mockups.

## Configuring

The [App Loggers](#app-loggers) take an optional config object.

```ts
interface LogOptions {
  /**
   *  Specify the minimum log level for all log outputs without their own level specified.
   *
   *  Defaults to env `LOG_LEVEL` or `info` if not specified.
   *
   *  @default 'info'
   * */
  level?: LogLevel
  /**
   * Specify the minimum log level streamed to the console (or docker container)
   * */
  console?: LogLevel
  /**
   * Specify the minimum log level to output to rotating files. If `false` no log files will be created.
   * */
  file?: LogLevel | false
  /**
   * The full path and filename to use for log files
   *
   * If using rolling files the filename will be appended with `.N` (a number) BEFORE the extension based on rolling status
   *
   * May also be specified using env LOG_PATH or a function that returns a string
   *
   * @default 'CWD/logs/app.log
   * */
  filePath?: string | (() => string)
}
```
Available `LogLevel` levels, from lowest to highest:

* `debug`
* `verbose`
* `log`
* `info`
* `warn`
* `error`
* `fatal`
* `silent`

```ts
const infoLogger = loggerApp({
 level: 'info' // console and file will log any levels `info` and above
});

const logger = loggerApp({
  console: 'debug', // console will log `debug` and higher
  file: 'warn' // file will log `warn` and higher
});
```

## Usage

### Child Loggers

[Pino Child loggers](https://getpino.io/#/docs/child-loggers) can be created using the `childLogger` function with the added ability to inherit **Labels** from their parent loggers.

**Labels** are inserted between the log level and message contents of a log. The child logger inherits **all** labels from **all** its parent loggers.

`childLogger` accepts a single string label or an array of string labels.

```ts
import {loggerApp, childLogger} from '@foxxmd/logging';

logger = loggerApp();
logger.debug('Test');
// [2024-03-07 11:27:41.944 -0500] DEBUG: Test

const nestedChild1 = childLogger(logger, 'First');
nestedChild1.debug('I am nested one level');
// [2024-03-07 11:27:41.945 -0500] DEBUG: [First] I am nested one level

const nestedChild2 = childLogger(nestedChild1, ['Second', 'Third']);
nestedChild2.warn('I am nested two levels but with more labels');
// [2024-03-07 11:27:41.945 -0500] WARN: [First] [Second] [Third] I am nested two levels but with more labels

const siblingLogger = childLogger(logger, ['1Sib','2Sib']);
siblingLogger.info('Test');
// [2024-03-07 11:27:41.945 -0500] INFO: [1Sib] [2Sib] Test
```

Labels can also be added at "runtime" by passing an object with `labels` prop to the logger level function. These labels will be appended to any existing labels on the logger.

```ts
logger.debug({labels: ['MyLabel']}, 'My log message');
```

### Serializing Objects and Errors

Passing an object or array as the first argument to the logger will cause the object to be JSONified and pretty printed below the log message

```ts
logger.debug({myProp: 'a string', nested: {anotherProps: ['val1', 'val2'], boolProp: true}}, 'Test');
 /*
[2024-03-07 11:39:37.687 -0500] DEBUG: Test
  myProp: "a string"
  nested: {
    "anotherProps": [
      "val1",
      "val2"
     ],
   "boolProp": true
  }
  */
```

Passing an `Error` as the first argument will pretty print the error stack including any [causes.](https://github.com/tc39/proposal-error-cause)

```ts
const er = new Error('This is the original error');
const causeErr = new ErrorWithCause('A top-level error', {cause: er});
logger.debug(causeErr, 'Test');
/*
[2024-03-07 11:43:27.453 -0500] DEBUG: Test
ErrorWithCause: A top-level error
    at <anonymous> (/my/dir/src/index.ts:55:18)
caused by: Error: This is the original error
    at <anonymous> (/my/dir/src/index.ts:54:12)
 */
```

Passing an `Error` without a second argument (message) will cause the top-level error's message to be printed instead of log message.

# Building A Logger

All the functionality required to build your own logger is exported by `@foxxmd/logging/factory`. You can customize almost every facet of logging.

A logger is composed of a minimum default level and array of objects that implement `StreamEntry`, the same interface used by [`pino.multistream`](https://getpino.io/#/docs/api?id=pino-multistream). The only constraint is that your streams must accept the same levels as `@foxxmd/logging` using the `LogLevelStreamEntry` interface that extends `StreamEntry`.

```ts
import {LogLevelStreamEntry} from '@foxxmd/logging';
import { buildLogger } from "@foxxmd/logging/factory";

const myStreams: LogLevelStreamEntry[] = [];
// build streams

const logger = buildLogger('debug', myStreams);
logger.debug('Test');
```

`factory` exports several "destination" `LogLevelStreamEntry` function creators with default configurations that can be overridden.

```ts
import {
    buildLogger,
    buildDestinationStream,     // generic NodeJS.WriteableStream or SonicBoom DestinationStream
    buildDestinationStdout,     // stream to STDOUT
    buildDestinationStderr,     // stream to STDERR
    buildDestinationFile,       // write to static file
    buildDestinationRollingFile // write to rolling file
} from "@foxxmd/logging/factory";
```

All `buildDestination` functions take args:

* `level` (first arg) - minimum level to log at
* `options` (second arg) - an object extending [`pino-pretty` options](https://github.com/pinojs/pino-pretty?tab=readme-ov-file#options)

`options` inherits a default `pino-pretty` configuration that comprises `@foxxmd/logging`'s opinionated logging format. The common default config can be generated using `prettyOptsFactory` which accepts an optional [`pino-pretty` options](https://github.com/pinojs/pino-pretty?tab=readme-ov-file#options) object to override defaults:

```ts
import { prettyOptsFactory } from "@foxxmd/logging/factory";

const defaultConfig = prettyOptsFactory();

// override with your own config
const myCustomizedConfig = prettyOptsFactory({ colorize: false });
```

Pre-configured `PrettyOptions` are also provided for different destinations:

```ts
import { 
    prettyConsole, // default config
    prettyFile     // disables colorize
} from "@foxxmd/logging/factory";
```

Specific buildDestinations also require passing a stream or path:

`buildDestinationStream` must pass a `NodeJS.WriteableStream` or SonicBoom `DestinationStream` to options as `destination`

```ts
import {buildDestinationStream} from "@foxxmd/logging/factory";

const myStream = new WritableStream();
const dest = buildDestinationStream('debug', {destination: myStream});
```

`buildDestinationStdout` and `buildDestinationStderr` do not require a destination as they are fixed to STDOUT/STDERR

`buildDestinationFile` and `buildDestinationRollingFile` must pass a `path` to options

```ts
import {buildDestinationFile} from "@foxxmd/logging/factory";

const dest = buildDestinationFile('debug', {path: '/path/to/file.log'});
```

### Example

Putting everything above together

```ts
import {
  buildDestinationStream,
  buildDestinationFile,
  prettyOptsFactory,
  buildDestinationStdout,
  buildLogger
} from "@foxxmd/logging/factory";
import { PassThrough } from "node:stream";

const hookStream = new PassThrough();
const hookDestination = buildDestinationStream('debug', {
  ...prettyOptsFactory({sync: true, ignore: 'pid'}),
  destination: hookStream
});

const debugFileDestination = buildDestinationFile('debug', {path: './myLogs/debug.log'});
const warnFileDestination = buildDestinationFile('warn', {path: './myLogs/warn.log'});

const logger = buildLogger('debug', [
  hookDestination,
  buildDestinationStdout('debug'),
  debugFileDestination,
  warnFileDestination
]);
hookStream.on('data', (log) => {console.log(log)});
logger.debug('Test')
// logs to hookStream
// logs to STDOUT
// logs to file ./myLogs/debug.log
// does NOT log to file ./myLogs/warn.log
```

### Parsing LogOptions

If you wish to use [`LogOptions`](#configuring) to get default log levels for your destinations use `parseLogOptions`:

```ts
import {parseLogOptions, LogOptions} from '@foxxmd/logging';

const parsedOptions: LogOptions = parseLogOptions(myConfig);
```
