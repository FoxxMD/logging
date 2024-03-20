import pinoRoll from 'pino-roll';
import {
    LogLevelStreamEntry,
    LogLevel,
    StreamDestination,
    FileDestination,
} from "./types.js";
import {destination} from "pino";
import {build} from "pino-pretty"
import {PRETTY_OPTS_FILE, prettyOptsConsoleFactory, prettyOptsFileFactory} from "./pretty.js";
import {fileOrDirectoryIsWriteable} from "./util.js";
import path from "path";


const pRoll = pinoRoll as unknown as typeof pinoRoll.default;

/**
 * Creates a `LogLevelStreamEntry` stream that writes to a rolling file at or above the minimum `level`
 * */
export const buildDestinationRollingFile = async (level: LogLevel | false, options: FileDestination): Promise<LogLevelStreamEntry | undefined> => {
    if (level === false) {
        return undefined;
    }
    const {
        path: logPath,
        size,
        frequency,
        timestamp = 'auto',
        ...rest
    } = options;

    if(size === undefined && frequency === undefined) {
        throw new Error(`For rolling files must specify at least one of 'frequency' , 'size'`);
    }

    const testPath = typeof logPath === 'function' ? logPath() : logPath;

    try {
        fileOrDirectoryIsWriteable(testPath);
    }  catch (e: any) {
        throw new Error('Cannot write logs to rotating file due to an error while trying to access the specified logging directory', {cause: e});
    }

    const pInfo = path.parse(testPath);
    let filePath: string | (() => string);
    if(typeof logPath === 'string' && frequency !== undefined) {
        filePath = () => {
            let dtStr: string;
            switch(timestamp) {
                case 'unix':
                    dtStr = Date.now().toString();
                    break;
                case 'iso':
                    dtStr = new Date().toISOString();
                    break;
                case 'auto':
                    dtStr = frequency === 'daily' ? new Date().toISOString().split('T')[0] : new Date().toISOString();
                    break;
            }
            return path.resolve(pInfo.dir, `${pInfo.name}-${dtStr}`)
        }
    } else {
        filePath = path.resolve(pInfo.dir, pInfo.name);
    }
    const rollingDest = await pRoll({
        file: filePath,
        size,
        frequency,
        extension: pInfo.ext,
        mkdir: true,
        sync: false,
    });

    return {
        level: level,
        stream: build({...PRETTY_OPTS_FILE, ...rest, destination: rollingDest})
    };
}

/**
 * Creates a `LogLevelStreamEntry` stream that writes to a static file at or above the minimum `level`
 * */
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
            stream: build({...prettyOptsFileFactory(rest), ...rest, destination: dest})
        };
    } catch (e: any) {
        throw new Error('WILL NOT write to file due to an error while trying to access the specified directory', {cause: e});
    }
}

/**
 * Creates a `LogLevelStreamEntry` stream that writes to a `NodeJs.WriteableStream` or [Sonic Boom `DestinationStream`](https://github.com/pinojs/sonic-boom) at or above the minimum `level`
 *
 * @see DestinationStream
 * */
export const buildDestinationStream = (level: LogLevel, options: StreamDestination): LogLevelStreamEntry => {
    return {
        level: level,
        stream: build({...prettyOptsConsoleFactory(options)})
    }
}

/**
 * Creates a `LogLevelStreamEntry` stream that writes to STDOUT at or above the minimum `level`
 *
 * @source
 * @see buildDestinationStream
 * */
export const buildDestinationStdout = (level: LogLevel, options: Omit<StreamDestination, 'destination'> = {}): LogLevelStreamEntry => {
    const opts = {...options, destination: destination({dest: 1, sync: true})}
    return buildDestinationStream(level, opts);
}

/**
 * Creates a `LogLevelStreamEntry` stream that writes to STDERR at or above the minimum `level`
 *
 * @source
 * @see buildDestinationStream
 * */
export const buildDestinationStderr = (level: LogLevel, options: Omit<StreamDestination, 'destination'> = {}): LogLevelStreamEntry => {
    const opts = {...options, destination: destination({dest: 2, sync: true})};
    return buildDestinationStream(level, opts);
}
