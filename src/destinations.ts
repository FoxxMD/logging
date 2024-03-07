import pinoRoll from 'pino-roll';
import {LogLevelStreamEntry, LogLevel, LogOptions, StreamDestination, FileDestination} from "./types.js";
import {DestinationStream, pino, destination} from "pino";
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
        const testPath = typeof logPath === 'function' ? logPath() : logPath;
        fileOrDirectoryIsWriteable(testPath);

        const pInfo = path.parse(testPath);
        let filePath: string | (() => string);
        if(typeof logPath === 'string') {
            filePath = () => path.resolve(pInfo.dir, `${pInfo.name}-${new Date().toISOString().split('T')[0]}`)
        } else {
            filePath = logPath;
        }
        const rollingDest = await pRoll({
            file: filePath,
            size: 10,
            frequency: 'daily',
            extension: pInfo.ext,
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

    const {path: logPathVal, ...rest} = options;

    try {
        const filePath = typeof logPathVal === 'function' ? logPathVal() : logPathVal;
        fileOrDirectoryIsWriteable(filePath);
        const dest = destination({dest: filePath, mkdir: true, sync: false})

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
    const opts = {...prettyConsole, ...options, destination: destination({dest: 1, sync: true})}
    return {
        level: level,
        stream: prettyDef.default(opts)
    }
}

export const buildDestinationStderr = (level: LogLevel, options: Omit<StreamDestination, 'destination'> = {}): LogLevelStreamEntry => {
    return {
        level: level,
        stream: prettyDef.default({...prettyConsole, ...options, destination: destination({dest: 2, sync: true})})
    }
}
