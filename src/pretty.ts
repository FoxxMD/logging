import {PrettyOptions} from "@foxxmd/pino-pretty";
import {CWD, getLongestStr} from "./util.js";
import {
    LOG_LEVEL_NAMES,
    PRETTY_COLORS,
    PRETTY_COLORS_STR,
    PRETTY_LEVELS,
    PRETTY_LEVELS_STR,
    PrettyOptionsExtra
} from "./types.js";

/**
 * Builds the opinionated `@foxxmd/logging` defaults for pino-pretty `PrettyOptions` and merges them with an optional user-provided `PrettyOptions` object
 * */
export const prettyOptsFactory = (opts: PrettyOptionsExtra = {}): PrettyOptions => {
    const {
        //customLevels = {},
        customColors = {},
        redactCwd = true,
        padLevels = true,
        customPrettifiers = {},
        ...rest
    } = opts;

    let redactFunc: (content: string) => string;
    if(redactCwd) {
        redactFunc = (content) => content.replaceAll(CWD, 'CWD');
    } else {
        redactFunc = (content) => content;
    }

    const longestLevelNameLength = getLongestStr([...LOG_LEVEL_NAMES]);
    const padLevelFunc = padLevel(longestLevelNameLength);

    if(padLevels && customPrettifiers.level === undefined) {
        customPrettifiers.level = (logLevel, key, log, { label, labelColorized }) => padLevelFunc(label, labelColorized)
    }

    return {
        messageFormat: (log, messageKey, levelLabel, {colors}) => {
            const labels: string[] = log.labels as string[] ?? [];
            const labelContent = labels.length === 0 ? '' : `${labels.map((x: string) => colors.blackBright(`[${x}]`)).join(' ')} `;
            const msg = redactFunc((log[messageKey] as string));
            const stackTrace = log.err !== undefined ? redactFunc(`\n${(log.err as any).stack}`) : '';
            return `${labelContent}${msg}${stackTrace}`;
        },
        hideObject: false,
        ignore: 'pid,hostname,labels,err',
        translateTime: 'SYS:standard',
        customLevels: buildLevels({}),
        customColors: buildColors(customColors),
        colorizeObjects: true,
        // @ts-ignore
        useOnlyCustomProps: false,
        customPrettifiers,
        ...rest
    }
}

const buildLevels = (userLevels: PrettyOptions['customLevels'] = {}): PrettyOptions['customLevels'] => {
    let levels: PrettyOptions['customLevels'];
    if (typeof userLevels === 'string') {
        levels = `${PRETTY_LEVELS_STR},${userLevels}`;
    } else {
        levels = {
            ...PRETTY_LEVELS,
            ...userLevels
        }
    }
    return levels;
}

const buildColors = (userColors: PrettyOptions['customColors'] = {}): PrettyOptions['customColors'] => {
    // pino-pretty has a bug that assumes customColors is always a string
    // so we need to rebuild as string even if an object is given

    let colors: PrettyOptions['customColors'];
    if (typeof userColors === 'string') {
        colors = `${PRETTY_COLORS_STR},${userColors}`;
    } else {
        colors = {
            ...PRETTY_COLORS,
            ...userColors
        }
        colors = Object.entries(colors).reduce((acc, [k, v]) => {
            return acc.concat(`${k}:${v}`)
        }, []).join(',');
    }
    return colors;
}

export const padLevel = (length: number) => (label: string, labelColorized?: string) => {
    // pad to fix alignment
    // assuming longest level is VERBOSE
    // and may be colorized
    const paddedLabel = label.padEnd(length)
    if(labelColorized !== undefined && labelColorized !== label) {
        const padDiff = paddedLabel.length - label.length;
        return labelColorized.padEnd(labelColorized.length + padDiff);
    }
    return paddedLabel;
}

const PRETTY_OPTS_CONSOLE_DEFAULTS: PrettyOptions = {sync: true};

/**
 * Generate pino-pretty `PrettyOptions` for use with console/stream output
 *
 * @source
 * */
export const prettyOptsConsoleFactory = (opts: PrettyOptionsExtra = {}): PrettyOptions => prettyOptsFactory({...opts, ...PRETTY_OPTS_CONSOLE_DEFAULTS});
/**
 * Pre-defined pino-pretty `PrettyOptions` for use with console/stream output
 *
 * @source
 * */
export const PRETTY_OPTS_CONSOLE: PrettyOptions = prettyOptsConsoleFactory();

const PRETTY_OPTS_FILE_DEFAULTS: PrettyOptions = {
    colorize: false,
    sync: false,
}

/**
 * Generate pino-pretty `PrettyOptions` for use with file output
 *
 * @source
 * */
export const prettyOptsFileFactory = (opts: PrettyOptionsExtra = {}): PrettyOptions => prettyOptsFactory({...opts, ...PRETTY_OPTS_FILE_DEFAULTS});

/**
 * Pre-defined pino-pretty `PrettyOptions` for use with file output
 *
 * @source
 * */
export const PRETTY_OPTS_FILE: PrettyOptions = prettyOptsFileFactory();
