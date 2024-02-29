import process from "process";
import {isLogOptions, LogLevel, LogOptions} from "./types.js";

export const parseLogOptions = (config: LogOptions = {}): Required<LogOptions> => {
    if (!isLogOptions(config)) {
        throw new Error(`Logging levels were not valid. Must be one of: 'silent', 'fatal', 'error', 'warn', 'info', 'verbose', 'debug',  -- 'file' may be false.`)
    }

    const {level: configLevel} = config;
    const envLevel = process.env.LOG_LEVEL as LogLevel | undefined;
    const defaultLevel = envLevel ?? 'info';
    const {
        level = configLevel || defaultLevel,
        file = configLevel || defaultLevel,
        console = configLevel || 'debug'
    } = config;

    return {
        level,
        file: file as LogLevel | false,
        console
    };
}
