import {
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    isLogOptions,
    LogData,
    LogLevel,
    LOG_LEVELS
} from './types.js'

import {
    parseLogOptions,
} from './funcs.js'

import {childLogger, loggerApp, loggerInit, loggerTest} from './loggers.js';

export type {
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    LogData,
    LogLevel,
    LOG_LEVELS
}

export {
    loggerApp,
    loggerInit,
    loggerTest,
    childLogger,
    parseLogOptions,
    isLogOptions
}
