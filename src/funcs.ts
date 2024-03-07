import process from "process";
import {FileLogOptions, FileLogOptionsParsed, isLogOptions, LogLevel, LogOptions, LogOptionsParsed} from "./types.js";
import {logPath, projectDir} from "./constants.js";
import {isAbsolute, resolve} from 'node:path';
import {MarkRequired} from "ts-essentials";

export const parseLogOptions = (config: LogOptions = {}): LogOptionsParsed => {
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
    } = config;

    let fileObj: FileLogOptionsParsed;
    if (typeof file === 'object') {
        if (file.level === false) {
            fileObj = {level: false};
        } else {
            const path = typeof file.path === 'function' ? file.path : getLogPath(file.path);
            fileObj = {
                level: configLevel || defaultLevel,
                ...file,
                path
            }
        }
    } else if (file === false) {
        fileObj = {level: false};
    } else {
        fileObj = {
            level: file,
            path: getLogPath()
        };
    }

    if(fileObj.level !== false && fileObj.frequency === undefined && fileObj.size === undefined) {
        // set default rolling log behavior
        fileObj.frequency = 'daily';
    }

    return {
        level,
        file: fileObj,
        console,
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
