import {
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    FileLogOptions,
    LogData,
    LogLevel,
    LOG_LEVELS,
    LoggerAppExtras
} from './types.js'

import {
    isLogOptions,
    parseLogOptions,
} from './funcs.js'

import {childLogger, loggerApp, loggerDebug, loggerTest, loggerAppRolling} from './loggers.js';

export type {
    FileLogOptions,
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    LogData,
    LogLevel,
    LoggerAppExtras
}

export {
    loggerApp,
    loggerAppRolling,
    loggerDebug,
    loggerTest,
    LOG_LEVELS,
    childLogger,
    parseLogOptions,
    isLogOptions
}
