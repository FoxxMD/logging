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

<img src="/assets/example.svg" alt="example log output">

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

* [`loggerTrace`](https://foxxmd.github.io/logging/variables/index.loggerTrace.html) - Logs to console at the lowest minimum level, `trace`. Can be used during application startup before a logger app configuration has been parsed.
* [`loggerDebug`](https://foxxmd.github.io/logging/variables/index.loggerDebug.html) - Logs ONLY to console at minimum `debug` level. Can be used during application startup before a logger app configuration has been parsed.
* [`loggerTest`](https://foxxmd.github.io/logging/variables/index.loggerTest.html) - A noop logger (will not log anywhere) for use in tests/mockups.

## Configuring

The [App Loggers](#app-loggers) take an optional [`LogOptions`](https://foxxmd.github.io/logging/interfaces/index.LogOptions.html) to configure [`LogLevel`](https://foxxmd.github.io/logging/types/index.LogLevel.html) globally or individually for **Console** and **File** outputs. [`file` in `LogOptions`](https://foxxmd.github.io/logging/interfaces/index.FileLogOptions.html) may also be an object that specifies more behavior for log file output.

```ts
const infoLogger = loggerApp({
 level: 'info' // console and file will log any levels `info` and above
});

const logger = loggerApp({
  console: 'debug', // console will log `debug` and higher
  file: 'warn' // file will log `warn` and higher
});

const fileLogger = loggerRollingApp({
  // no level specified => console defaults to `info` level
  file: {
      level: 'warn', // file will log `warn` and higher
      path: '/my/cool/path/output.log', // output to log file at this path
      frequency: 'daily', // rotate hourly
      size: '20MB', // rotate if file size grows larger than 20MB
      timestamp: 'unix' // use unix epoch timestamp instead of iso8601 in rolling file
  }
});
```

An optional second parameter, [`LoggerAppExtras`](https://foxxmd.github.io/logging/interfaces/index.LoggerAppExtras.html), may be passed that allows adding additional log destinations or pino-pretty customization to the [App Loggers](#app-loggers). Some defaults and convenience variables for pino-pretty options are also available in [`@foxxmd/logging/factory`]((https://foxxmd.github.io/logging/modules/factory.html)) prefixed with `PRETTY_`.

An example using `LoggerAppExtras`:
```ts
import { loggerApp } from '@foxxmd/logging';
import {
    PRETTY_ISO8601,
    buildDestinationFile 
} from "@foxxmd/logging/factory";

// additional file logging but only at `warn` or higher
const warnFileDestination = buildDestinationFile('warn', {path: './myLogs/warn.log'});

const logger = loggerApp({
  level: 'debug', // console AND built-in file logging will log `debug` and higher
  }, {
   destinations: [warnFileDestination],
   pretty: {
     translateTime: PRETTY_ISO8601 // replaces standard timestamp with ISO8601 format
   }
});
logger.debug('Test');
// [2024-03-07T11:27:41-05:00] DEBUG: Test
```

See [Building A Logger](#building-a-logger) for more information.

#### Colorizing Docker Logs

Color output to STD out/err is normally automatically detected by [colorette](https://github.com/jorgebucaran/colorette) or can manually be set using `colorize` anywhere [PrettyOptions](https://foxxmd.github.io/logging/interfaces/factory._internal_.PrettyOptions_.html) are accepted. However docker output can be hard to detect as supporting colorizing, or the output may not be TTY at the container interface but is viewed by a terminal or web app that does support colorizing.

Therefore `@foxxmd/logging` will look for a `COLORED_STD` environmental variable and, if no other `colorize` option is set _and the ENV is not empty_, will use the truthy value of this variable to set `colorize` **for any `buildDestinationStdout` or `buildDestinationStderr` transports.** This includes the built-in stdout transports for `loggerApp` and `loggerAppRolling`.

Thus you could set `COLORED_STD=true` in your Dockerfile to coerce colored output to docker logs. If a user does not want colored output for any reason they can simply override the environmental variable like `COLORED_STD=false`

## Usage

### Child Loggers

[Pino Child loggers](https://getpino.io/#/docs/child-loggers) can be created using the [`childLogger`](https://foxxmd.github.io/logging/functions/index.childLogger.html) function with the added ability to inherit **Labels** from their parent loggers.

**Labels** are inserted between the log level and message contents of a log. The child logger inherits **all** labels from **all** its parent loggers.

`childLogger` accepts a single string/function label or an array of string/function labels.

```ts
import {loggerApp, childLogger} from '@foxxmd/logging';

logger = loggerApp();
logger.debug('Test');
// [2024-03-07 11:27:41.944 -0500] DEBUG: Test

const nestedChild1 = childLogger(logger, 'First');
nestedChild1.debug('I am nested one level');
// [2024-03-07 11:27:41.945 -0500] DEBUG: [First] I am nested one level

const nestedChild2 = childLogger(nestedChild1, ['Second', () => 'Third']);
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

**NOTE:** If a label *function* throws an error then the label will be the error's message. Make sure your labels don't throw!

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
Error: A top-level error
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

# Examples

Various use-cases for `@foxxmd/logging` and how to configure a logger for them.

Remember, `loggerApp` and `loggerAppRolling` **accept the same arguments.** The examples below use `loggerApp` but `loggerAppRolling` can be used as a drop-in replacement in order to use a rolling log file.

#### Log to Console and File

```ts
import {loggerApp, loggerAppRolling} from '@foxxmd/logging';

// static log file at ./logs/app.log
const staticLogger = loggerApp();

// rolling log file at ./logs/app.1.log
const rollingLogger = loggerAppRolling();
```

#### Log At Specific Level Or Higher for Console and File

```ts
import {loggerApp} from '@foxxmd/logging';

// INFO is the default level
// when 'console' is not specified it logs to 'info' or higher
// when 'file' is not specified it logs to 'info' or higher
const infoLogger = loggerApp();

// logs to console and log at 'debug' level and higher
const debugLogger = loggerApp({level: 'debug'});
```

#### Log At `debug` for Console and `warn` for File

```ts
import {loggerApp} from '@foxxmd/logging';

const logger = loggerApp({
  console: 'debug',
  file: 'warn'
});
```

#### Do not log to File

```ts
import {loggerApp} from '@foxxmd/logging';

// also logs to console at 'info' level
const logger = loggerApp({
  file: false
});
```

#### Log to Specific File

```ts
import {loggerApp} from '@foxxmd/logging';

// also logs to console at 'info' level
const logger = loggerApp({
  file: {
      path: './path/to/file.log'
  }
});
```

#### Log to Rolling File with Unix Timestamp

```ts
import {loggerApp} from '@foxxmd/logging';

// also logs to console at 'info' level
const logger = loggerApp({
  file: {
      timestamp: 'unix'
  }
});
```

#### Log to Rolling File with no timestamp

```ts
import {loggerApp} from '@foxxmd/logging';

// also logs to console at 'info' level
const logger = loggerApp({
  file: {
      // specify size but NOT 'frequency' to disable timestamps in filename
      size: '10M'
  }
});
```

#### Log to additional File for 'error' only

```ts
import {loggerApp} from '@foxxmd/logging';
import { buildDestinationFile } from "@foxxmd/logging/factory";

const errorFileDestination = buildDestinationFile('error', {path: './myLogs/warn.log'});

// also logs to console and file at 'info' level
const logger = loggerApp({}, {
    destinations: [errorFileDestination]
});
```

#### Log raw, newline-delimited json logs to additional File

```ts
import {loggerApp} from '@foxxmd/logging';
import { buildDestinationFile } from "@foxxmd/logging/factory";
import fs from 'node:fs';

const rawFile = fs.createWriteStream('myRawFile.log');

// also logs to console and file at 'info' level
const logger = loggerApp({}, {
    destinations: [
      {
          level: 'debug',
          stream: rawFile // logs are NOT prettified, only raw data from pino
      }
    ]
});
```

#### Log prettified data to additional stream

This could be used to trigger something when a log object with a specific property is found. Or to stream prettified log json to a client over websockets.

To emit data as an object ([`LogDataPretty`](https://foxxmd.github.io/logging/types/index.LogDataPretty.html)) set `objectMode` and `object` to true.

```ts
import {loggerApp} from '@foxxmd/logging';
import { buildDestinationJsonPrettyStream } from "@foxxmd/logging/factory";
import { PassThrough } from "node:stream";

const prettyObjectStream = new Passthrough({objectMode: true}); // objectMode MUST be true to get objects from the stream
const prettyObjectDestination = buildDestinationJsonPrettyStream('debug', {
  destination: prettyObjectStream,
  object: true, // must be set to true to use with objectMode stream
  colorize: true
});

const prettyStringStream = new Passthrough(); // will emit data as a json string
const prettyStringDestination = buildDestinationJsonPrettyStream('debug', {
  destination: prettyStringStream,
  object: false,
  colorize: true
});

// also logs to console and file at 'info' level
const logger = loggerApp({}, {
    destinations: [
      prettyObjectDestination,
      prettyStringDestination
    ]
});

prettyObjectStream.on('data', (log) => {
  // do something with log object (LogDataPretty) 
});

prettyStringStream.on('data', (log) => {
  // do something with log string
});
```

#### Log to additional Pino Transports

Log to a [Pino Transport](https://getpino.io/#/docs/transports) like [pino-elasticsearch](https://getpino.io/#/docs/transports?id=pino-elasticsearch):

```ts
import {loggerApp} from '@foxxmd/logging';
import pinoElastic from 'pino-elasticsearch'

const streamToElastic = pinoElastic({
  index: 'an-index',
  node: 'http://localhost:9200',
  esVersion: 7,
  flushBytes: 1000
});

// also logs to console and file at 'info' level
const logger = loggerApp({}, {
    destinations: [
      {
          level: 'debug',
          stream: streamToElastic
      }
    ]
});
```
