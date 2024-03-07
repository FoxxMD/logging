import process from "process";
import {isLogOptions, LogLevel, LogOptions} from "./types.js";
import {logPath, projectDir} from "./constants.js";
import {isAbsolute, resolve} from 'node:path';

export const parseLogOptions = (config: LogOptions = {}): Required<LogOptions> => {
    if (!isLogOptions(config)) {
        throw new Error(`Logging levels were not valid. Must be one of: 'silent', 'fatal', 'error', 'warn', 'info', 'verbose', 'debug',  -- 'file' may be false.`)
    }

    const {level: configLevel} = config;
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    const defaultLevel = envLevel ?? 'info';
    const {
        level = configLevel || defaultLevel,
        file = configLevel || defaultLevel,
        console = configLevel || 'debug',
        filePath
    } = config;

    return {
        level,
        file: file as LogLevel | false,
        console,
        filePath: typeof filePath === 'function' ? filePath : getLogPath(filePath)
    };
}

export const getLogPath = (path?: string) => {
    let pathVal: string;
    if (path !== undefined) {
        pathVal = path;
    } else if (typeof process.env.LOG_PATH === 'string') {
        pathVal = process.env.LOG_PATH;
    } else {
        pathVal = logPath;
    }

    if (isAbsolute(pathVal)) {
        return pathVal;
    }

    return resolve(projectDir, pathVal);
}
