import {DestinationStream, Level, Logger as PinoLogger, StreamEntry} from 'pino';
import {ErrorWithCause} from "pony-cause";
import {PrettyOptions} from "pino-pretty";

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
     * @default 'CWD/logs/app.log'
     * */
    filePath?: string | (() => string)
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
        if(key === 'filePath') {
            return t === 'string' || t === 'function';
        }
        if(t !== 'string' && t !== 'boolean') {
            return false;
        }
        if (key !== 'file') {
            return LOG_LEVELS.includes(val.toLocaleLowerCase());
        }
        return val === false || LOG_LEVELS.includes(val.toLocaleLowerCase());
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

export type FileDestination =    Omit<PrettyOptions, 'destination' | 'sync'> & {path: string | (() => string)};
export type StreamDestination =  Omit<PrettyOptions, 'destination'> & {destination: number | DestinationStream | NodeJS.WritableStream};
