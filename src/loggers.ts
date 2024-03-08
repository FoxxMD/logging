import {parseLogOptions} from "./funcs.js";
import {Logger, LogLevel, LogLevelStreamEntry, LogOptions} from "./types.js";
import {buildDestinationFile, buildDestinationRollingFile, buildDestinationStdout} from "./destinations.js";
import {pino} from "pino";

export const buildLogger = (defaultLevel: LogLevel, streams: LogLevelStreamEntry[]): Logger => {
    const plogger = pino({
        // @ts-ignore
        mixin: (obj, num, loggerThis) => {
            return {
                labels: loggerThis.labels ?? []
            }
        },
        mixinMergeStrategy(mergeObject: Record<any, any>, mixinObject: Record<any, any>) {
            if(mergeObject.labels === undefined || mixinObject.labels === undefined || mixinObject.labels.length === 0) {
                return Object.assign(mergeObject, mixinObject)
            }
            const runtimeLabels = Array.isArray(mergeObject.labels) ? mergeObject.labels : [mergeObject.labels];
            const finalObj = Object.assign(mergeObject, mixinObject);
            finalObj.labels = [...(mixinObject.labels ?? []), ...runtimeLabels];
            return finalObj;
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
/**
 * A noop (no output) logger for use when testing a component that requires a Logger
 *
 * @source
 * */
export const loggerTest = buildLogger('silent', [buildDestinationStdout('debug')]);


/**
 * A logger that ONLY logs to console at minimum 'debug' level. Useful for logging during startup before a loggerApp has been initialized
 *
 * @source
 * */
export const loggerDebug = buildLogger('debug', [buildDestinationStdout('debug')]);

export const loggerApp = (config: LogOptions | object = {}) => {
    const options = parseLogOptions(config);
    const streams: LogLevelStreamEntry[] = [buildDestinationStdout(options.console)];

    let error: Error;
    if(options.file.level !== false) {
        try {
            const file = buildDestinationFile(options.file.level, {...options.file, append: true});
            if (file !== undefined) {
                streams.push(file);
            }
        } catch (e) {
            error = e;
        }
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
    if(options.file.level !== false) {
        try {
            const file = await buildDestinationRollingFile(options.file.level, options.file);
            if (file !== undefined) {
                streams.push(file);
            }
        } catch (e) {
            error = e;
        }
    }
    const logger = buildLogger('debug' as LogLevel, streams);
    if (error !== undefined) {
        logger.warn(error);
    }
    return logger;
}
