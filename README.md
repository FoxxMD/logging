# @foxxmd/logging

[![Latest Release](https://img.shields.io/github/v/release/foxxmd/logging)](https://github.com/FoxxMD/logging/releases)
[![NPM Version](https://img.shields.io/npm/v/%40foxxmd%2Flogging)](https://www.npmjs.com/package/@foxxmd/logging)
[![Try on Runkit](https://img.shields.io/static/v1?label=Try%20it%20online%20on&message=RunKit&color=f55fa6)](https://npm.runkit.com/%40foxxmd%2Flogging)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A typed, opinionated, batteries-included, [Pino](https://getpino.io)-based logging solution for backend TS/JS projects.

Features:

* Fully typed for Typescript projects
* One-line, [turn-key logging](#quick-start) to console and rotating file
* [Child (nested) loggers](#child-loggers) with hierarchical label prefixes for log messages
* Per-destination level filtering configurable via ENV or arguments
* Clean, opinionated log output format powered by [pino-pretty](https://github.com/pinojs/pino-pretty):
  * Colorized output when stream is TTY and supports it
  * Automatically [serialize passed objects and Errors](#serializing-objects-and-errors), including [Error Cause](https://github.com/tc39/proposal-error-cause)
  * Automatically redact current working directory from log output
* [Bring-Your-Own settings](#additional-app-logger-configuration)
  * Add or use your own streams/[transports](https://getpino.io/#/docs/transports?id=known-transports) for destinations
  * All pino-pretty configs are exposed and extensible
* [Build-Your-Own Logger](#building-a-logger)
  * Don't want to use any of the pre-built transports? Leverage the convenience of @foxxmd/logging wrappers and default settings but build your logger from scratch

<img src="/assets/example.png" alt="example log output">

**Documentation best viewed on [https://foxxmd.github.io/logging](https://foxxmd.github.io/logging)**

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

* [`loggerApp`](https://foxxmd.github.io/logging/functions/index.loggerApp.html) - Logs to console and a fixed file destination
* [`loggerAppRolling`](https://foxxmd.github.io/logging/functions/index.loggerAppRolling.html) - Logs to console and a rolling file destination

### Helper Loggers

These loggers are pre-defined for specific use cases:

* [`loggerDebug`](https://foxxmd.github.io/logging/variables/index.loggerDebug.html) - Logs ONLY to console at minimum `debug` level. Can be used during application startup before a logger app configuration has been parsed.
* [`loggerTest`](https://foxxmd.github.io/logging/variables/index.loggerTest.html) - A noop logger (will not log anywhere) for use in tests/mockups.

## Configuring

The [App Loggers](#app-loggers) take an optional config object [`LogOptions`](https://foxxmd.github.io/logging/interfaces/index.LogOptions.html):

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
   * Specify the minimum log level to output for files or a log file options object. If `false` no log files will be created.
   * */
  file?: LogLevel | false | FileLogOptions
}
```
Available [`LogLevel`](https://foxxmd.github.io/logging/types/index.LogLevel.html) levels, from lowest to highest:

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

### File Options

[`file` in `LogOptions`](https://foxxmd.github.io/logging/interfaces/index.FileLogOptions.html) may be an object that specifies more behavior log files.

<details>

<summary>File Options</summary>

```ts
export interface FileOptions {
  /**
   * The path and filename to use for log files.
   *
   * If using rolling files the filename will be appended with `.N` (a number) BEFORE the extension based on rolling status.
   *
   * May also be specified using env LOG_PATH or a function that returns a string.
   *
   * If path is relative the absolute path will be derived from the current working directory.
   *
   * @default 'CWD/logs/app.log'
   * */
  path?: string | (() => string)
  /**
   * For rolling log files
   *
   * When
   * * value passed to rolling destination is a string (`path` option) and
   * * `frequency` is defined
   *
   * This determines the format of the datetime inserted into the log file name:
   *
   * * `unix` - unix epoch timestamp in milliseconds
   * * `iso`  - Full ISO8601 datetime IE '2024-03-07T20:11:34-00:00'
   * * `auto`
   *   * When frequency is `daily` only inserts date IE YYYY-MM-DD
   *   * Otherwise inserts full ISO8601 datetime
   *
   * @default 'auto'
   * */
  timestamp?: 'unix' | 'iso' | 'auto'
  /**
   * The maximum size of a given rolling log file.
   *
   * Can be combined with frequency. Use k, m and g to express values in KB, MB or GB.
   *
   * Numerical values will be considered as MB.
   * */
  size?: number | string
  /**
   * The amount of time a given rolling log file is used. Can be combined with size.
   *
   * Use `daily` or `hourly` to rotate file every day (or every hour). Existing file within the current day (or hour) will be re-used.
   *
   * Numerical values will be considered as a number of milliseconds. Using a numerical value will always create a new file upon startup.
   *
   * @default 'daily'
   * */
  frequency?: 'daily' | 'hourly' | number
}
```

</details>

### Additional App Logger Configuration

`loggerApp` and `loggerAppRolling` accept an optional second parameter, [`LoggerAppExtras`](https://foxxmd.github.io/logging/interfaces/index.LoggerAppExtras.html) that allows adding additional log destinations or pino-pretty customization:

```ts
export interface LoggerAppExtras {
  /**
   * Additional pino-pretty options that are applied to the built-in console/log streams (including CWD redaction)
   * */
  pretty?: PrettyOptionsExtra
  /**
   * Additional logging destinations to use alongside the built-in console/log stream. These can be any created by buildDestination* functions or other Pino Transports
   * */
  destinations?: LogLevelStreamEntry[]
  /**
   * Additional Pino Log options that are passed to `pino()` on logger creation
   * */
  pino?: PinoLoggerOptions
}
```

Some defaults and convenience variables for pino-pretty options are available in `@foxxmd/logging/factory` prefixed with `PRETTY_`. See [factory variables docs](https://foxxmd.github.io/logging/modules/factory.html) for all options.

An example using the extras parameter:

```ts
import { loggerApp } from '@foxxmd/logging';
import {
    PRETTY_ISO8601, // replaces standard timestamp with ISO8601 format
    buildDestinationFile 
} from "@foxxmd/logging/factory";

const warnFileDestination = buildDestinationFile('warn', {path: './myLogs/warn.log'});

const logger = loggerApp({}, {
   destinations: [warnFileDestination],
   pretty: {
     translateTime: PRETTY_ISO8601
   }
});
logger.debug('Test');
// [2024-03-07T11:27:41-05:00] DEBUG: Test
```

See [Building A Logger](#building-a-logger) for more information.

## Usage

### Child Loggers

[Pino Child loggers](https://getpino.io/#/docs/child-loggers) can be created using the [`childLogger`](https://foxxmd.github.io/logging/functions/index.childLogger.html) function with the added ability to inherit **Labels** from their parent loggers.

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

All the functionality required to build your own logger is exported by [`@foxxmd/logging/factory`](https://foxxmd.github.io/logging/modules/factory.html). You can customize almost every facet of logging.

A logger is composed of a minimum default level and array of objects that implement [`StreamEntry`](https://foxxmd.github.io/logging/interfaces/index._internal_.StreamEntry-1.html), the same interface used by [`pino.multistream`](https://getpino.io/#/docs/api?id=pino-multistream). The only constraint is that your streams must accept the same levels as `@foxxmd/logging` using the [`LogLevelStreamEntry`](https://foxxmd.github.io/logging/types/index.LogLevelStreamEntry.html) interface that extends `StreamEntry`.

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
* `options` (second arg) - an object extending [`pino-pretty` options](https://github.com/pinojs/pino-pretty?tab=readme-ov-file#options), [`PrettyOptions`](https://foxxmd.github.io/logging/interfaces/factory._internal_.PrettyOptions_.html)

`options` inherits a default `pino-pretty` configuration that comprises `@foxxmd/logging`'s opinionated logging format. The common default config can be generated using [`prettyOptsFactory`](https://foxxmd.github.io/logging/functions/factory.prettyOptsFactory.html) which accepts an optional `PrettyOptions` object to override defaults:

```ts
import { prettyOptsFactory } from "@foxxmd/logging/factory";

const defaultConfig = prettyOptsFactory();

// override with your own config
const myCustomizedConfig = prettyOptsFactory({ colorize: false });
```

Pre-configured `PrettyOptions` are also provided for different destinations:

```ts
import {
  PRETTY_OPTS_CONSOLE, // default config
  PRETTY_OPTS_FILE     // disables colorize
} from "@foxxmd/logging/factory";
```

Specific buildDestinations also require passing a stream or path:

[`buildDestinationStream`](https://foxxmd.github.io/logging/functions/factory.buildDestinationStream.html) must pass a `NodeJS.WriteableStream` or SonicBoom `DestinationStream` to options as [`destination`](https://foxxmd.github.io/logging/types/factory.StreamDestination.html)

```ts
import {buildDestinationStream} from "@foxxmd/logging/factory";

const myStream = new WritableStream();
const dest = buildDestinationStream('debug', {destination: myStream});
```

[`buildDestinationStdout`](https://foxxmd.github.io/logging/functions/factory.buildDestinationStdout.html) and [`buildDestinationStderr`](https://foxxmd.github.io/logging/functions/factory.buildDestinationStderr.html) do not require a destination as they are fixed to STDOUT/STDERR

[`buildDestinationFile`](https://foxxmd.github.io/logging/functions/factory.buildDestinationFile.html) and [`buildDestinationRollingFile`](https://foxxmd.github.io/logging/functions/factory.buildDestinationRollingFile.html) must pass a [`path`](https://foxxmd.github.io/logging/types/factory.FileDestination.html) to options

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

If you wish to use [`LogOptions`](#configuring) to get default log levels for your destinations use [`parseLogOptions`](https://foxxmd.github.io/logging/functions/index.parseLogOptions.html):

```ts
import {parseLogOptions, LogOptions} from '@foxxmd/logging';

const parsedOptions: LogOptions = parseLogOptions(myConfig);
```
