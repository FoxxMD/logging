import {Level, Logger as PinoLogger, StreamEntry} from 'pino';
import {ErrorWithCause} from "pony-cause";

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
     * Specify the minimum log level streamed to the console (or docker container)
     * */
    console?: LogLevel
}

export const isLogOptions = (obj: object = {}): obj is LogOptions => {
    return Object.entries(obj).every(([key, val]) => {
        const t = typeof val;
        if(t !== 'string' && t !== 'boolean') {
            return false;
        }
        if (key !== 'file') {
            return val === undefined || LOG_LEVELS.includes(val.toLocaleLowerCase());
        }
        return val === undefined || val === false || LOG_LEVELS.includes(val.toLocaleLowerCase());
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
