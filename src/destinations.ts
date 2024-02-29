import pinoRoll from 'pino-roll';
import {LogLevelStreamEntry, LogLevel, LogOptions, StreamDestination, FileDestination} from "./types.js";
import {DestinationStream, pino} from "pino";
import prettyDef, {PrettyOptions} from "pino-pretty";
import {prettyConsole, prettyFile} from "./pretty.js";
import {fileOrDirectoryIsWriteable} from "./util.js";
import path from "path";
import {ErrorWithCause} from "pony-cause";

const pRoll = pinoRoll as unknown as typeof pinoRoll.default;
export const buildDestinationRollingFile = async (level: LogLevel | false, options: FileDestination): Promise<LogLevelStreamEntry | undefined> => {
    if (level === false) {
        return undefined;
    }
    const {path: logPath, ...rest} = options;

    try {
        fileOrDirectoryIsWriteable(logPath);
        const rollingDest = await pRoll({
            file: path.resolve(logPath, 'app'),
            size: 10,
            frequency: 'daily',
            get extension() {
                return `-${new Date().toISOString().split('T')[0]}.log`
            },
            mkdir: true,
            sync: false,
        });

        return {
            level: level,
            stream: prettyDef.default({...prettyFile, ...rest, destination: rollingDest})
        };
    } catch (e: any) {
        throw new ErrorWithCause<Error>('WILL NOT write logs to rotating file due to an error while trying to access the specified logging directory', {cause: e as Error});
    }
}

export const buildDestinationFile = (level: LogLevel | false, options: FileDestination): LogLevelStreamEntry | undefined => {
    if (level === false) {
        return undefined;
    }

    const {path: logPath, ...rest} = options;

    try {
        fileOrDirectoryIsWriteable(logPath);
        const dest = pino.destination({dest: path, sync: false})

        return {
            level: level,
            stream: prettyDef.default({...prettyFile, ...rest, destination: dest})
        };
    } catch (e: any) {
        throw new ErrorWithCause<Error>('WILL NOT write to file due to an error while trying to access the specified directory', {cause: e as Error});
    }
}

export const buildDestinationStream = (level: LogLevel, options: StreamDestination): LogLevelStreamEntry => {
    return {
        level: level,
        stream: prettyDef.default({...prettyConsole, ...options})
    }
}

export const buildDestinationStdout = (level: LogLevel, options: Omit<StreamDestination, 'destination'> = {}): LogLevelStreamEntry => {
    return {
        level: level,
        stream: prettyDef.default({...prettyConsole, ...options, destination: 1})
    }
}

export const buildDestinationStderr = (level: LogLevel, options: Omit<StreamDestination, 'destination'> = {}): LogLevelStreamEntry => {
    return {
        level: level,
        stream: prettyDef.default({...prettyConsole, ...options, destination: 2})
    }
}
