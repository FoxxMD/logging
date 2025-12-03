import {parseLogOptions} from "./funcs.js";
import {
    PinoLoggerOptions,
    CUSTOM_LEVELS,
    Logger,
    LoggerAppExtras,
    LogLevel,
    LogLevelStreamEntry,
    LogOptions
} from "./types.js";
import {buildDestinationFile, buildDestinationRollingFile, buildDestinationStdout} from "./destinations.js";
import {pino, levels, stdSerializers} from "pino";

/**
 * Builds a Logger object for use in your application
 *
 * `defaultLevel` must the minimum level ANY stream can log from IE it should be the lowest level any of your streams will possibly log. Recommended to always use `debug`.
 *
 * @see Logger
 * */
export const buildLogger = (defaultLevel: LogLevel, streams: LogLevelStreamEntry[], extras: PinoLoggerOptions = {}): Logger => {
    // TODO maybe implement custom levels
    //const { levels = {} } = extras;

    const plogger = pino<"verbose" | "log">({
        // @ts-ignore
        mixin: (obj, num, loggerThis: Logger) => {
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
        customLevels: CUSTOM_LEVELS,
        useOnlyCustomLevels: false,
        serializers: {
            err: stdSerializers.err,
            labels: (labels: any[]) => {
                // allow dynamic labels
                return labels.map(x => {
                    if(typeof x === 'function') {
                        try {
                            return x()
                        } catch (e) {
                            return e.message;
                        }
                    }
                    return x;

                }).filter(x => x !== null && x !== undefined);
            },
        },
        ...extras
    }, pino.multistream(streams, {levels: {...levels.values, ...CUSTOM_LEVELS}})) as Logger;
    plogger.labels = [];

    plogger.addLabel = function (value) {
        if (this.labels === undefined) {
            this.labels = [];
        }
        this.labels.push(value)
    }
    return plogger;
}

/**
 * Returns a new logger with the given properties appended to all log objects created by it
 *
 * @param parent Logger Parent logger to inherit from
 * @param labelsVal (any | any[]) Labels to always apply to logs from this logger
 * @param context object Additional properties to always apply to logs from this logger
 * @param options object
 * */
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

/**
 * A Logger that logs to console and a static file
 * */
export const loggerApp = (config: LogOptions | object = {}, extras?: LoggerAppExtras) => {

    const {
        pretty = {},
        destinations = [],
        pino,
    } = extras || {};

    const options = parseLogOptions(config, extras);
    const streams: LogLevelStreamEntry[] = [
        buildDestinationStdout(options.console, pretty),
        ...destinations
    ];

    let error: Error;
    if(options.file.level !== false) {
        try {
            const file = buildDestinationFile(options.file.level, {...options.file, ...pretty, append: true});
            if (file !== undefined) {
                streams.push(file);
            }
        } catch (e) {
            error = e;
        }
    }

    const logger = buildLogger('debug' as LogLevel, streams, pino);
    if (error !== undefined) {
        logger.warn(error);
    }
    return logger;
}

/**
 * A Logger that logs to console and a rolling file
 * */
export const loggerAppRolling = async (config: LogOptions | object = {}, extras?: LoggerAppExtras) => {

    const {
        pretty = {},
        destinations = [],
        pino,
    } = extras || {};

    const options = parseLogOptions(config, extras);
    const streams: LogLevelStreamEntry[] = [
        buildDestinationStdout(options.console, pretty),
        ...destinations
    ];

    let error: Error;
    if(options.file.level !== false) {
        try {
            const file = await buildDestinationRollingFile(options.file.level, {...options.file, ...pretty});
            if (file !== undefined) {
                streams.push(file);
            }
        } catch (e) {
            error = e;
        }
    }
    const logger = buildLogger('debug' as LogLevel, streams, pino);
    if (error !== undefined) {
        logger.warn(error);
    }
    return logger;
}
