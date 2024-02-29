import {
    LabelledLogger,
    AllLevels,
    AllLevelStreamEntry,
    LogOptions,
    asLogOptions,
    LogData
} from './types.js'

import {
    prettyOptsFactory,
    prettyFile,
    prettyConsole,
    buildPinoLogger,
    buildPinoConsoleStream,
    buildPinoFileStream,
    buildParsedLogOptions,
    testPinoLogger,
    initPinoLogger,
    appPinoLogger,
    createChildLogger,
} from './funcs.js'

export type {
    LabelledLogger,
    AllLevels,
    AllLevelStreamEntry,
    LogOptions,
    LogData
}

export {
    asLogOptions,
    buildParsedLogOptions
}

export const streamBuilders = {
    file: buildPinoFileStream,
    console: buildPinoConsoleStream,
}

export const pretty = {
    buildPretty: prettyOptsFactory,
    prettyFile,
    prettyConsole,
};

export const buildLogger = buildPinoLogger;

export const loggers = {
    init: initPinoLogger,
    test: testPinoLogger,
    app: appPinoLogger
};

export const childLogger = createChildLogger;
