import process from "process";
import {
    ChildLabel,
    FileLogOptions,
    FileLogOptionsParsed,
    FileLogPathOptions,
    FilterLabelsFunc,
    LOG_LEVEL_NAMES,
    LogLevel,
    LogOptions,
    LogOptionsParsed
} from "./types.js";
import {projectDir, logPathRelative} from "./constants.js";
import {isAbsolute, resolve} from 'node:path';

export const isLogOptions = (obj: object = {}): obj is LogOptions => {
    return Object.entries(obj).every(([key, val]) => {
        if (val === undefined || !['file','console','level'].includes(key)) {
            return true;
        }
        const t = typeof val;
        if (key === 'file') {
            if (t === 'object') {
                return isFileLogOptions(val);
            }
            return t === 'string' || val === false;
        }
        if (t !== 'string') {
            return false;
        }
        return LOG_LEVEL_NAMES.includes(val.toLocaleLowerCase());
    });
}
const isFileLogOptions = (obj: any): obj is FileLogOptions => {
    if (obj === null || typeof obj !== 'object') {
        return false;
    }
    const levelOk = obj.level === undefined || ('level' in obj && obj.level === false || LOG_LEVEL_NAMES.includes(obj.level.toLocaleLowerCase()));
    const pathOk = obj.path === undefined || ('path' in obj && typeof obj.path === 'string' || typeof obj.path === 'function');
    const frequencyOk = obj.frequency === undefined || ('frequency' in obj && typeof obj.frequency === 'string' || typeof obj.frequency === 'number');
    const sizeOk = obj.size === undefined || ('size' in obj && typeof obj.size === 'string' || typeof obj.size === 'number');
    const tsOk = obj.timestamp === undefined || ('timestamp' in obj && typeof obj.timestamp === 'string');

    return levelOk && pathOk && frequencyOk && sizeOk && tsOk;
}
/**
 * Takes an object and parses it into a fully-populated LogOptions object based on opinionated defaults
 * */
export const parseLogOptions = (config: LogOptions = {}, options?: FileLogPathOptions): LogOptionsParsed => {
    if (!isLogOptions(config)) {
        throw new Error(`Logging levels were not valid. Must be one of: 'silent', 'fatal', 'error', 'warn', 'info', 'verbose', 'debug', 'trace'  -- 'file' may be false.`)
    }

    const {level: configLevel} = config;
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    const defaultLevel = envLevel ?? 'info';
    const {
        level = configLevel || defaultLevel,
        file = configLevel || defaultLevel,
        console = configLevel || envLevel || 'debug',
    } = config;

    let fileObj: FileLogOptionsParsed;
    if (typeof file === 'object') {
        if (file.level === false) {
            fileObj = {level: false};
        } else {
            const path = typeof file.path === 'function' ? file.path : getLogPath(file.path, options);
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
            path: getLogPath(undefined, options)
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

export const getLogPath = (path?: string, options: FileLogPathOptions = {}) => {
    const {
        logBaseDir: baseDir = projectDir,
        logDefaultPath = logPathRelative
    } = options;
    let pathVal: string;
    if (path !== undefined) {
        pathVal = path;
    } else if (typeof process.env.LOG_PATH === 'string') {
        pathVal = process.env.LOG_PATH;
    } else {
        pathVal = logDefaultPath;
    }

    if (isAbsolute(pathVal)) {
        return pathVal;
    }

    return resolve(baseDir, pathVal);
}

export const labelsStrBuilder = (labels: ChildLabel[]) => {
    return labels.map(x => typeof x === 'function' ? 'dynamicfunc' : x.toLocaleLowerCase().trim()).reverse().join(':');
}
export const labelFilterToRegex = (filter: string) => {
    const reverseCleaned = filter.split(':').map(x => x.trim().toLocaleLowerCase().replace('*','.+')).reverse().join(':');
    return new RegExp(`^${reverseCleaned}`);
}

export const labelFiltersFromStr = (str?: string): RegExp[] | undefined => {
    if(str === undefined || str.trim() === '') {
        return undefined;
    }
    return str.split(',').map(x => labelFilterToRegex(x.trim()));
}

export const labelFiltersFromEnvSingleton = (envName: string): FilterLabelsFunc => {
    let envFilterRes: false | RegExp[];
    return (labels: ChildLabel[]) => {
        if(envFilterRes === undefined) {
            envFilterRes = labelFiltersFromStr(process.env[envName]);
            if(envFilterRes === undefined) {
                envFilterRes = false;
            }
        }
        if(envFilterRes === false) {
            return false;
        }

        const labelStr = labelsStrBuilder(labels);
        return envFilterRes.some(x => x.test(labelStr));
    }
}


export const labelsEnableFromEnvSingleton = labelFiltersFromEnvSingleton('LOG_FILTER_ENABLE');
export const labelsDisableFromEnvSingleton = labelFiltersFromEnvSingleton('LOG_FILTER_DISABLE');

export const labelsFilterFromEnv = (envName: string): FilterLabelsFunc => {
    return (labels: ChildLabel[]) => {
        const envFilterRes = labelFiltersFromStr(process.env[envName]);
        if(envFilterRes === undefined) {
            return false;
        }
        const labelStr = labelsStrBuilder(labels);
        return envFilterRes.some(x => x.test(labelStr));
    }
}

export const labelsEnableFromEnv = labelsFilterFromEnv('LOG_FILTER_ENABLE');
export const labelsDisableFromEnv = labelsFilterFromEnv('LOG_FILTER_DISABLE');