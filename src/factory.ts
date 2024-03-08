import {prettyConsole, prettyFile, PRETTY_COLORS, PRETTY_COLORS_STR, PRETTY_LEVELS, PRETTY_LEVELS_STR, PRETTY_ISO8601, prettyOptsFactory} from "./pretty.js";
import {buildDestinationStream, buildDestinationRollingFile, buildDestinationStdout, buildDestinationStderr, buildDestinationFile} from "./destinations.js";
import {buildLogger} from './loggers.js';
import {FileDestination, StreamDestination} from './types.js'

export {
    prettyConsole,
    prettyFile,
    PRETTY_COLORS,
    PRETTY_COLORS_STR,
    PRETTY_LEVELS,
    PRETTY_LEVELS_STR,
    PRETTY_ISO8601,
    prettyOptsFactory,
    buildDestinationStream,
    buildDestinationStdout,
    buildDestinationStderr,
    buildDestinationFile,
    buildDestinationRollingFile,
    buildLogger
}

export type {
    FileDestination,
    StreamDestination
}
