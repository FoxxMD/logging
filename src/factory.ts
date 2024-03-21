import {
    PRETTY_OPTS_CONSOLE,
    PRETTY_OPTS_FILE,
    //PRETTY_LEVELS,
    //PRETTY_LEVELS_STR,
    prettyOptsFactory,
    prettyOptsFileFactory,
    prettyOptsConsoleFactory
} from "./pretty.js";
import {
    buildDestinationStream,
    buildDestinationJsonPrettyStream,
    buildDestinationRollingFile,
    buildDestinationStdout,
    buildDestinationStderr,
    buildDestinationFile
} from "./destinations.js";
import {buildLogger} from './loggers.js';
import {FileDestination, PRETTY_COLORS, PRETTY_COLORS_STR, PRETTY_ISO8601, StreamDestination, JsonPrettyDestination} from './types.js'

export {
    PRETTY_OPTS_CONSOLE,
    PRETTY_OPTS_FILE,
    PRETTY_COLORS,
    PRETTY_COLORS_STR,
    //PRETTY_LEVELS,
    //PRETTY_LEVELS_STR,
    PRETTY_ISO8601,
    prettyOptsFactory,
    prettyOptsFileFactory,
    prettyOptsConsoleFactory,
    buildDestinationStream,
    buildDestinationJsonPrettyStream,
    buildDestinationStdout,
    buildDestinationStderr,
    buildDestinationFile,
    buildDestinationRollingFile,
    buildLogger
}

export type {
    FileDestination,
    StreamDestination,
    JsonPrettyDestination
}
