import pinoRoll from 'pino-roll';
import {
    LogLevelStreamEntry,
    LogLevel,
    StreamDestination,
    FileDestination, JsonPrettyDestination,
} from "./types.js";
import {destination, DestinationStream} from "pino";
import {build, prettyFactory} from "pino-pretty"
import {PRETTY_OPTS_FILE, prettyOptsConsoleFactory, prettyOptsFileFactory} from "./pretty.js";
import {fileOrDirectoryIsWriteable} from "./util.js";
import path from "path";
import {Transform, TransformCallback} from "node:stream";
import pump from 'pump';
import abstractTransport from 'pino-abstract-transport';


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
 * Creates a `LogLevelStreamEntry` stream that writes the raw log data with prettified log line, as either a JSON string or object, to a `NodeJs.WriteableStream` or [Sonic Boom `DestinationStream`](https://github.com/pinojs/sonic-boom) at or above the minimum `level`
 *
 * Use this to get raw log data + formatted line rendered by pino-pretty. The prettified line is set to the `line` key in the object.
 *
 * WARNING: This is not a fast operation. The log data must be parsed to json before being prettified, which also parses data to json. If you only need raw log data you should pass a plain Passthrough or Transform stream as an additional destination and then JSON.parse() on 'data' event manually.
 *
 * If used with `object: true` then
 *
 * * the `destination` cannot be a file or SonicBoom object
 * * the `destination` stream passed MUST be set to `objectMode: true`
 *
 * @see DestinationStream
 * */
export const buildDestinationJsonPrettyStream = (level: LogLevel, options: JsonPrettyDestination): LogLevelStreamEntry => {
    const {object = false} = options;
    const factoryOpts = prettyOptsConsoleFactory(options);
    const prettyFunc = prettyFactory(factoryOpts);

    const stream = new Transform({
        objectMode: object,
        autoDestroy: true,
        transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
            const data = JSON.parse(chunk.toString());
            const line = prettyFunc(chunk);
            data.line = line.substring(0, line.length - 1);
            if(object) {
                callback(null, data);
            } else {
                callback(null, `${JSON.stringify(data)}\n`);
            }
        }
    });

    let destinationStream: DestinationStream | NodeJS.WritableStream;

    if(typeof options.destination === 'object' && typeof options.destination.write === 'function') {
        destinationStream = options.destination;
    } else {
        destinationStream = destination({...factoryOpts, dest: stream});
    }

    if(object) {
        // @ts-ignore
        pump(stream, destinationStream)

        return {
            level: level,
            stream: stream
        }
    }

    // @ts-ignore
    const transport = abstractTransport(function (source) {
        source.on('unknown', function (line) {
            destinationStream.write(line + '\n')
        })

        // @ts-ignore
        pump(source, stream, destinationStream);
        return stream;
    }, { parse: 'lines' });

    return {
        level: level,
        stream: transport
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
