import {parseLogOptions} from "./funcs.js";
import {Logger, LogLevel, LogLevelStreamEntry, LogOptions} from "./types.js";
import {buildDestinationFile, buildDestinationRollingFile, buildDestinationStdout} from "./destinations.js";
import {pino} from "pino";
import {logPath} from "./constants.js";
import path from "path";

export const buildLogger = (defaultLevel: LogLevel, streams: LogLevelStreamEntry[]): Logger => {
    const plogger = pino({
        // @ts-ignore
        mixin: (obj, num, loggerThis) => {
            return {
                labels: loggerThis.labels ?? []
            }
        },
        level: defaultLevel,
        customLevels: {
            verbose: 25,
            log: 21
        },
        useOnlyCustomLevels: false,
    }, pino.multistream(streams)) as Logger;
    plogger.labels = [];

    plogger.addLabel = function (value) {
        if (this.labels === undefined) {
            this.labels = [];
        }
        this.labels.push(value)
    }
    return plogger;
}
export const childLogger = (parent: Logger, labelsVal: any | any[] = [], context: object = {}, options = {}): Logger => {
    const newChild = parent.child(context, options) as Logger;
    const labels = Array.isArray(labelsVal) ? labelsVal : [labelsVal];
    newChild.labels = [...[...(parent.labels ?? [])], ...labels];
    newChild.addLabel = function (value) {
        if (this.labels === undefined) {
            this.labels = [];
        }
        this.labels.push(value);
    }
    return newChild
}
export const loggerTest = buildLogger('silent', [buildDestinationStdout('debug')]);

export const loggerDebug = buildLogger('debug', [buildDestinationStdout('debug')]);

export const loggerApp = (config: LogOptions | object = {}) => {
    const options = parseLogOptions(config);
    const streams: LogLevelStreamEntry[] = [buildDestinationStdout(options.console)];

    let error: Error;
    try {
        const file = buildDestinationFile(options.file, {path: options.filePath, append: true});
        if (file !== undefined) {
            streams.push(file);
        }
    } catch (e) {
        error = e;
    }
    const logger = buildLogger('debug' as LogLevel, streams);
    if (error !== undefined) {
        logger.warn(error);
    }
    return logger;
}

export const loggerAppRolling = async (config: LogOptions | object = {}) => {
    const options = parseLogOptions(config);
    const streams: LogLevelStreamEntry[] = [buildDestinationStdout(options.console)];

    let error: Error;
    try {
        const file = await buildDestinationRollingFile(options.file, {path: logPath});
        if (file !== undefined) {
            streams.push(file);
        }
    } catch (e) {
        error = e;
    }
    const logger = buildLogger('debug' as LogLevel, streams);
    if (error !== undefined) {
        logger.warn(error);
    }
    return logger;
}
