import {parseLogOptions} from "./funcs.js";
import {Logger, LogLevel, LogLevelStreamEntry, LogOptions} from "./types.js";
import {buildDestinationRollingFile, buildDestinationStdout} from "./destinations.js";
import {pino} from "pino";
import {logPath} from "./constants.js";

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

export const loggerInit = buildLogger('debug', [buildDestinationStdout('debug')]);

export const loggerApp = async (config: LogOptions | object = {}) => {
    const options = parseLogOptions(config);
    const streams: LogLevelStreamEntry[] = [buildDestinationStdout(options.console)];
    const file = await buildDestinationRollingFile(options.file, {path: logPath});
    if(file !== undefined) {
        streams.push(file);
    }
    return buildLogger('debug' as LogLevel, streams);
}
