import {DestinationStream, Level, Logger as PinoLogger, StreamEntry} from 'pino';
import {ErrorWithCause} from "pony-cause";
import {PrettyOptions} from "pino-pretty";
import {MarkRequired} from "ts-essentials";

export type LogLevel = typeof LOG_LEVELS[number];
export const LOG_LEVELS= ['silent', 'fatal', 'error', 'warn', 'info', 'log', 'verbose', 'debug'] as const;

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

export const isLogOptions = (obj: object = {}): obj is LogOptions => {
    return Object.entries(obj).every(([key, val]) => {
        if(val === undefined) {
            return true;
        }
        const t = typeof val;
        if(key === 'file') {
            if(t === 'object') {
                return isFileLogOptions(t);
            }
            return t === 'string' || val === false;
        }
        if(t !== 'string') {
            return false;
        }
        return LOG_LEVELS.includes(val.toLocaleLowerCase());
    });
}

export type Logger = PinoLogger<LogLevel> & {
    labels: any[]
    addLabel: (value: any) => void
}

export type LogLevelStreamEntry = StreamEntry<LogLevel>

export type LogData = Record<string, any> & {
    level: number
    time: number
    pid: number
    hostname: string
    labels: any[]
    msg: string | Error | ErrorWithCause
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
     * * value passed to rolling destination is a string (`filePath` from LogOptions is a string)
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
     * If path is relative the absolute path will be derived from the current working directory.
     *
     * @default 'CWD/logs/app.log'
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

const isFileLogOptions = (obj: any): obj is FileLogOptions => {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    const levelOk = obj.level === undefined || ('level' in obj && obj.level === false || LOG_LEVELS.includes(obj.level.toLocaleLowerCase()));
    const pathOk = obj.path === undefined || ('path' in obj && typeof obj.path === 'string' || typeof obj.path === 'function');
    const frequencyOk = obj.frequency === undefined || ('frequency' in obj && typeof obj.frequency === 'string' || typeof obj.frequency === 'number');
    const sizeOk = obj.size === undefined || ('size' in obj && typeof obj.size === 'string' || typeof obj.size === 'number');
    const tsOk = obj.timestamp === undefined || ('timestamp' in obj && typeof obj.timestamp === 'string');

    return levelOk && pathOk && frequencyOk && sizeOk && tsOk;
}

export type FileDestination =    Omit<PrettyOptions, 'destination' | 'sync'> & FileOptionsParsed;
export type StreamDestination =  Omit<PrettyOptions, 'destination'> & {destination: number | DestinationStream | NodeJS.WritableStream};

export type LogOptionsParsed = Omit<Required<LogOptions>, 'file'> & { file: FileLogOptionsParsed }
