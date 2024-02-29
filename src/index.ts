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

import {childLogger, loggerApp, loggerDebug, loggerTest, loggerAppRolling} from './loggers.js';

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
    loggerAppRolling,
    loggerDebug,
    loggerTest,
    childLogger,
    parseLogOptions,
    isLogOptions
}
