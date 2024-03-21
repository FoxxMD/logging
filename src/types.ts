import {DestinationStream, Logger as PinoLogger, LoggerOptions, StreamEntry, Level} from 'pino';
import {PrettyOptions} from "pino-pretty";
import {MarkRequired} from "ts-essentials";

export type LogLevel = typeof LOG_LEVEL_NAMES[number];

/**
 * Pino default levels
 *
 * @see pino/lib/constants.js
 * */
const PINO_DEFAULT_LEVELS = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
}

const PINO_DEFAULT_LEVEL_NAMES = Object.keys(PINO_DEFAULT_LEVELS) as (Level)[];

/**
 * Additional levels included in @foxxmd/logging as an object
 *
 * These are always applied when using `prettyOptsFactory` but can be overridden
 * */
export const CUSTOM_LEVELS: LoggerOptions<"verbose" | "log">['customLevels'] = {
    verbose: 25,
    log: 21
}

const CUSTOM_LEVEL_NAMES = Object.keys(CUSTOM_LEVELS);

export const LOG_LEVEL_NAMES= ['silent', 'fatal', 'error', 'warn', 'info', 'log', 'verbose', 'debug'] as const;

export interface LogOptions {
    /**
     *  Specify the minimum log level for all log outputs without their own level specified.
     *
     *  Defaults to env `LOG_LEVEL` or `info` if not specified.
     *
     *  @default 'info'
     * */
    level?: LogLevel
    /**
     * Specify the minimum log level to output to rotating files or file output options. If `false` no log files will be created.
     * */
    file?: LogLevel | false | FileLogOptions
    /**
     * Specify the minimum log level streamed to the console (or docker container)
     * */
    console?: LogLevel
}

export type Logger = PinoLogger<LogLevel> & {
    labels: any[]
    addLabel: (value: any) => void
}

/**
 * An object with a `write` function that can be used by pino as a [Transport](https://getpino.io/#/docs/transports)
 *
 * All `buildDestination*` functions return this type as well as any [Pino Transport](https://getpino.io/#/docs/transports?id=known-transports)
 * */
export type LogLevelStreamEntry = StreamEntry<LogLevel>

/**
 * The structure of a Log object when returned by a stream `data` event
 * */
export type LogData = Record<string, any> & {
    level: number
    time: number
    pid: number
    hostname: string
    labels: any[]
    msg: string | Error
}

export interface PinoRollOptions {
    /**
     * The maximum size of a given rolling log file.
     *
     * Can be combined with frequency. Use k, m and g to express values in KB, MB or GB.
     *
     * Numerical values will be considered as MB.
     *
     * @default '10MB'
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

export interface RollOptions {
    /**
     * For rolling log files
     *
     * When
     * * value passed to rolling destination is a string (`path` from LogOptions is a string) and
     * * `frequency` is defined
     *
     * This determines the format of the datetime inserted into the log file name:
     *
     * * `unix` - unix epoch timestamp in milliseconds
     * * `iso`  - Full [ISO8601](https://en.wikipedia.org/wiki/ISO_8601) datetime IE '2024-03-07T20:11:34Z'
     * * `auto`
     *   * When frequency is `daily` only inserts date IE YYYY-MM-DD
     *   * Otherwise inserts full ISO8601 datetime
     *
     * @default 'auto'
     * */
    timestamp?: 'unix' | 'iso' | 'auto'
}

export interface FileOptions extends PinoRollOptions, RollOptions {
    /**
     * The path and filename to use for log files.
     *
     * If using rolling files the filename will be appended with `.N` (a number) BEFORE the extension based on rolling status.
     *
     * May also be specified using env LOG_PATH or a function that returns a string.
     *
     * If path is relative the absolute path will be derived from `logBaseDir` (in `LoggerAppExtras`) which defaults to CWD
     *
     * @default './logs/app.log'
     * @see LoggerAppExtras
     * */
    path?: string | (() => string)
}

export type FileOptionsParsed = MarkRequired<FileOptions, 'path'>;

export interface FileLogOptions extends FileOptions {
    /**
     * Specify the minimum log level to output to rotating files. If `false` no log files will be created.
     * */
    level?: LogLevel | false
}

export interface FileLogOptionsStrong extends FileLogOptions {
    level: LogLevel
    path: string | (() => string)
}

export type FileLogOptionsParsed = (Omit<FileLogOptions, 'file'> & {level: false}) | FileLogOptionsStrong

export type FileDestination =    Omit<PrettyOptionsExtra, 'destination' | 'sync'> & FileOptionsParsed;
export type StreamDestination =  Omit<PrettyOptionsExtra, 'destination'> & {destination: number | DestinationStream | NodeJS.WritableStream};
export type JsonPrettyDestination =  StreamDestination & {
    /**
     * Specify if the stream should output log as object or stringified JSON
     * */
    object?: boolean
};

export type LogOptionsParsed = Omit<Required<LogOptions>, 'file'> & { file: FileLogOptionsParsed }

export interface LoggerAppExtras {
    /**
     * Additional pino-pretty options that are applied to the built-in console/log streams
     * */
    pretty?: PrettyOptionsExtra
    /**
     * Additional logging destinations to use alongside the built-in console/log stream. These can be any created by `buildDestination*` functions or other [Pino Transports](https://getpino.io/#/docs/transports?id=known-transports)
     * */
    destinations?: LogLevelStreamEntry[]
    /**
     * Additional [Pino Log options](https://getpino.io/#/docs/api?id=options) that are passed to `pino()` on logger creation
     * */
    pino?: PinoLoggerOptions

    /**
     * The base path to use when parsing file logging options.
     *
     * @see FileOptions
     *
     * @default 'CWD'
     * */
    logBaseDir?: string
}

/**
 * Additional [Pino Log options](https://getpino.io/#/docs/api?id=options) that are passed to `pino()` on logger creation
 * */
export type PinoLoggerOptions = Omit<LoggerOptions, 'level' | 'mixin' | 'mixinMergeStrategy' | 'customLevels' | 'useOnlyCustomLevels' | 'transport'>

/**
 * pino-pretty options and additional options specific to how @foxxmd/logging uses pino-pretty
 * */
export interface PrettyOptionsExtra extends Omit<PrettyOptions, 'customLevels'> {
    /**
     * Control whether the current working directory should be replaced with 'CWD' in log output
     *
     * Useful for eliminating noisy parent paths that aren't relevant during debugging -- or to protect user privacy.
     *
     * **NOTE:** Only applies to log message and errors. If you need to redact arbitrary properties you should use pino's [`redact`](https://getpino.io/#/docs/api?id=redact-array-object) or pino-pretty's [`customPrettifiers`](https://github.com/pinojs/pino-pretty?tab=readme-ov-file#options)
     *
     * @default true
     * */
    redactCwd?: boolean
    /**
     * Pads levels in log string so all are the same length
     *
     * @default true
     * */
    padLevels?: boolean
}

/**
 * Additional levels included in @foxxmd/logging as an object
 *
 * These are always applied when using `prettyOptsFactory` but can be overridden
 * */
export const PRETTY_LEVELS: Extract<PrettyOptions['customLevels'], object> = CUSTOM_LEVELS;
/**
 * Additional levels included in @foxxmd/logging as a string
 *
 * These are always applied when using `prettyOptsFactory` but can be overridden
 * */
export const PRETTY_LEVELS_STR: Extract<PrettyOptions['customLevels'], string> = 'verbose:25,log:21';
/**
 * Additional level colors included in @foxxmd/logging as an object
 *
 * These are always applied when using `prettyOptsFactory` but can be overridden
 * */
export const PRETTY_COLORS_STR: Extract<PrettyOptions['customColors'], string> = 'verbose:magenta,log:greenBright';
/**
 * Additional level colors included in @foxxmd/logging as a string
 *
 * These are always applied when using `prettyOptsFactory` but can be overridden
 * */
export const PRETTY_COLORS: Extract<PrettyOptions['customColors'], object> = {
    'verbose': 'magenta',
    'log': 'greenBright'
}
/**
 * Use on `translateTime` pino-pretty option to print timestamps in ISO8601 format
 * */
export const PRETTY_ISO8601 = 'SYS:yyyy-mm-dd"T"HH:MM:ssp';
