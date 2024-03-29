import {
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    FileLogOptions,
    LogData,
    LogDataPretty,
    LogLevel,
    LOG_LEVEL_NAMES,
    LoggerAppExtras,
    PrettyOptionsExtra
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
    LogDataPretty,
    LogLevel,
    LoggerAppExtras,
    PrettyOptionsExtra
}

export {
    loggerApp,
    loggerAppRolling,
    loggerDebug,
    loggerTest,
    LOG_LEVEL_NAMES,
    childLogger,
    parseLogOptions,
    isLogOptions
}
