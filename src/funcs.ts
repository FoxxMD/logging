import path from "path";
import process from "process";
import {ErrorWithCause} from "pony-cause";
import {
    AllLevelStreamEntry,
    asLogOptions,
    LabelledLogger,
    LogLevel,
    LogOptions
} from "./types.js";
import {
    pino,
    LevelWithSilentOrString,
} from 'pino';
import pinoRoll from 'pino-roll';
import prettyDef, {PrettyOptions} from 'pino-pretty';
import {createColors} from 'colorette';
import * as Colorette from "colorette";
import {fileOrDirectoryIsWriteable} from "./util.js";

const projectDir = process.cwd();
const configDir: string = path.resolve(projectDir, './config');

const pRoll = pinoRoll as unknown as typeof pinoRoll.default;

let logPath = path.resolve(configDir, `./logs`);
if (typeof process.env.CONFIG_DIR === 'string') {
    logPath = path.resolve(process.env.CONFIG_DIR, './logs');
}

export type AppLogger = LabelledLogger

const CWD = process.cwd();
export const prettyOptsFactory = (opts: PrettyOptions = {}): PrettyOptions => {
    const {colorize} = opts;
    const colorizeOpts: undefined | {useColor: boolean} = colorize === undefined ? undefined : {useColor: colorize};
    const colors = createColors(colorizeOpts)

    return {
        ...prettyCommon(colors),
        ...opts
    }
}

export const prettyCommon = (colors: Colorette.Colorette): PrettyOptions => {
    return {
        messageFormat: (log, messageKey) => {
            const labels: string[] = log.labels as string[] ?? [];
            const leaf = log.leaf as string | undefined;
            const nodes = labels;
            if (leaf !== null && leaf !== undefined && !nodes.includes(leaf)) {
                nodes.push(leaf);
            }
            const labelContent = nodes.length === 0 ? '' : `${nodes.map((x: string) => colors.blackBright(`[${x}]`)).join(' ')} `;
            const msg = log[messageKey];
            const stackTrace = log.err !== undefined ? `\n${(log.err as any).stack.replace(CWD, 'CWD')}` : '';
            return `${labelContent}${msg}${stackTrace}`;
        },
        hideObject: false,
        ignore: 'pid,hostname,labels,err',
        translateTime: 'SYS:standard',
        customLevels: {
            verbose: 25,
            log: 21,
        },
        customColors: 'verbose:magenta,log:greenBright',
        colorizeObjects: true,
        // @ts-ignore
        useOnlyCustomProps: false,
    }
}

export const prettyConsole: PrettyOptions = prettyOptsFactory()
export const prettyFile: PrettyOptions = prettyOptsFactory({
    colorize: false,
});

const buildParsedLogOptions = (config: object = {}): Required<LogOptions> => {
    if (!asLogOptions(config)) {
        throw new Error(`Logging levels were not valid. Must be one of: 'error', 'warn', 'info', 'verbose', 'debug', 'silent' -- 'file' may be false.`)
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

export const buildPinoFileStream = async (options: Required<LogOptions>): Promise<AllLevelStreamEntry | undefined> => {
    const {file} = options;
    if(file === false) {
        return undefined;
    }

    try {
        fileOrDirectoryIsWriteable(logPath);
        const rollingDest = await pRoll({
            file: path.resolve(logPath, 'app'),
            size: 10,
            frequency: 'daily',
            get extension() {return `-${new Date().toISOString().split('T')[0]}.log`},
            mkdir: true,
            sync: false,
        });

        return {
            level: file as LogLevel,
            stream: prettyDef.default({...prettyFile, destination: rollingDest})
        };
    } catch (e: any) {
        throw new ErrorWithCause<Error>('WILL NOT write logs to rotating file due to an error while trying to access the specified logging directory', {cause: e as Error});
    }
}

export const buildPinoConsoleStream = (options: Required<LogOptions>): AllLevelStreamEntry => {
    return {
        level: options.console as LogLevel,
        stream: prettyDef.default({...prettyConsole, destination: 1, sync: true})
    }
}

export const buildPinoLogger = (defaultLevel: LevelWithSilentOrString, streams: AllLevelStreamEntry[]): LabelledLogger => {
    const plogger = pino({
        // @ts-ignore
        mixin: (obj, num, loggerThis) => {
            return {
                labels: loggerThis.labels ?? []
            }
        },
        level: defaultLevel,
        customLevels: {
            verbose: 25,
            log: 21
        },
        useOnlyCustomLevels: false,
    }, pino.multistream(streams)) as LabelledLogger;

    plogger.addLabel = function (value) {
        if (this.labels === undefined) {
            this.labels = [];
        }
        this.labels.push(value)
    }
    return plogger;
}

export const testPinoLogger = buildPinoLogger('silent', [buildPinoConsoleStream(buildParsedLogOptions({level: 'debug'}))]);

export const initPinoLogger = buildPinoLogger('debug', [buildPinoConsoleStream(buildParsedLogOptions({level: 'debug'}))]);

export const appPinoLogger = async (config: LogOptions | object = {}, name = 'App') => {
    const options = buildParsedLogOptions(config);
    const streams: AllLevelStreamEntry[] = [buildPinoConsoleStream(options)];
    const file = await buildPinoFileStream(options);
    if(file !== undefined) {
        streams.push(file);
    }
    return buildPinoLogger('debug' as LevelWithSilentOrString, streams);
}

export const createChildPinoLogger = (parent: LabelledLogger, labelsVal: any | any[] = [], context: object = {}, options = {}) => {
    const newChild = parent.child(context, options) as LabelledLogger;
    const labels = Array.isArray(labelsVal) ? labelsVal : [labelsVal];
    newChild.labels = [...[...(parent.labels ?? [])], ...labels];
    newChild.addLabel = function (value) {
        if(this.labels === undefined) {
            this.labels = [];
        }
        this.labels.push(value);
    }
    return newChild
}
export const createChildLogger = (logger: AppLogger, labelsVal: any | any[] = []): AppLogger => {
    const labels = Array.isArray(labelsVal) ? labelsVal : [labelsVal];
    return createChildPinoLogger(logger as LabelledLogger, labels);
}
