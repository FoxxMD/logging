import pinoRoll from 'pino-roll';
import {LogLevelStreamEntry, LogLevel, LogOptions} from "./types.js";
import {DestinationStream} from "pino";
import prettyDef, {PrettyOptions} from "pino-pretty";
import {prettyConsole, prettyFile} from "./pretty.js";
import {logPath} from "./constants.js";
import {fileOrDirectoryIsWriteable} from "./util.js";
import path from "path";
import {ErrorWithCause} from "pony-cause";

const pRoll = pinoRoll as unknown as typeof pinoRoll.default;
export const buildDestinationFile = async (options: Required<LogOptions> & {
    path?: string
}): Promise<LogLevelStreamEntry | undefined> => {
    const {file} = options;
    if (file === false) {
        return undefined;
    }

    const logToPath = options.path ?? logPath;

    try {
        fileOrDirectoryIsWriteable(logToPath);
        const rollingDest = await pRoll({
            file: path.resolve(logToPath, 'app'),
            size: 10,
            frequency: 'daily',
            get extension() {
                return `-${new Date().toISOString().split('T')[0]}.log`
            },
            mkdir: true,
            sync: false,
        });

        return {
            level: file as LogLevel,
            stream: prettyDef.default({...prettyFile, destination: rollingDest})
        };
    } catch (e: any) {
        throw new ErrorWithCause<Error>('WILL NOT write logs to rotating file due to an error while trying to access the specified logging directory', {cause: e as Error});
    }
}
export const buildDestinationStream = (options: Required<LogOptions> & {
    stream?: DestinationStream | NodeJS.WritableStream
} & PrettyOptions): LogLevelStreamEntry => {
    const {console, stream = 1, ...rest} = options;
    return {
        level: console as LogLevel,
        stream: prettyDef.default({...prettyConsole, ...rest, destination: stream, sync: true})
    }
}
