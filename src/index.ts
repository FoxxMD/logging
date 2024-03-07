import {
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    FileLogOptions,
    isLogOptions,
    LogData,
    LogLevel,
    LOG_LEVELS
} from './types.js'

import {
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
    LOG_LEVELS
}

export {
    loggerApp,
    loggerAppRolling,
    loggerDebug,
    loggerTest,
    childLogger,
    parseLogOptions,
    isLogOptions
}
