import {
    LabelledLogger,
    AllLevels,
    AllLevelStreamEntry,
    LogOptions,
    asLogOptions
} from './types.js'

import {
    prettyOptsFactory,
    prettyFile,
    prettyConsole,
    buildPinoLogger,
    buildPinoConsoleStream,
    buildPinoFileStream,
    testPinoLogger,
    initPinoLogger,
    appPinoLogger,
    createChildLogger,
} from './funcs.js'

export {
    LabelledLogger,
    AllLevels,
    AllLevelStreamEntry,
    LogOptions,
    asLogOptions
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
