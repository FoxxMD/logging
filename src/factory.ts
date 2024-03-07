import {prettyConsole, prettyFile, prettyOptsFactory} from "./pretty.js";
import {buildDestinationStream, buildDestinationRollingFile, buildDestinationStdout, buildDestinationStderr, buildDestinationFile} from "./destinations.js";
import {buildLogger} from './loggers.js';
import {FileDestination, StreamDestination} from './types.js'

export {
    prettyConsole,
    prettyFile,
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
