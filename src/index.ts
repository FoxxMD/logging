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
    PrettyOptionsExtra,
    ChildLoggerOptions
} from './types.js'

import {
    isLogOptions,
    parseLogOptions,
    labelsStrBuilder,
    labelFiltersFromStr,
    labelFiltersFromEnvSingleton,
    labelsEnableFromEnvSingleton,
    labelsDisableFromEnvSingleton,
    labelsFilterFromEnv,
    labelsEnableFromEnv,
    labelsDisableFromEnv
} from './funcs.js'

import {childLogger, loggerApp, loggerDebug, loggerTest, loggerTrace, loggerAppRolling} from './loggers.js';

export type {
    FileLogOptions,
    Logger,
    LogLevelStreamEntry,
    LogOptions,
    LogData,
    LogDataPretty,
    LogLevel,
    LoggerAppExtras,
    PrettyOptionsExtra,
    ChildLoggerOptions
}

export {
    loggerApp,
    loggerAppRolling,
    loggerDebug,
    loggerTest,
    loggerTrace,
    LOG_LEVEL_NAMES,
    childLogger,
    parseLogOptions,
    isLogOptions,
    labelsStrBuilder,
    labelFiltersFromStr,
    labelFiltersFromEnvSingleton,
    labelsEnableFromEnvSingleton,
    labelsDisableFromEnvSingleton,
    labelsFilterFromEnv,
    labelsEnableFromEnv,
    labelsDisableFromEnv
}
