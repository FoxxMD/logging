import {PrettyOptions} from "pino-pretty";
import {CWD} from "./util.js";
import {PRETTY_COLORS, PRETTY_COLORS_STR, PRETTY_LEVELS, PRETTY_LEVELS_STR} from "./types.js";

/**
 * Builds the opinionated `@foxxmd/logging` defaults for pino-pretty `PrettyOptions` and merges them with an optional user-provided `PrettyOptions` object
 * */
export const prettyOptsFactory = (opts: Omit<PrettyOptions, 'customLevels'> = {}): PrettyOptions => {
    const {
        //customLevels = {},
        customColors = {},
        ...rest
    } = opts;

    return {
        messageFormat: (log, messageKey, levelLabel, {colors}) => {
            const labels: string[] = log.labels as string[] ?? [];
            const leaf = log.leaf as string | undefined;
            const nodes = labels;
            if (leaf !== null && leaf !== undefined && !nodes.includes(leaf)) {
                nodes.push(leaf);
            }
            const labelContent = nodes.length === 0 ? '' : `${nodes.map((x: string) => colors.blackBright(`[${x}]`)).join(' ')} `;
            const msg = (log[messageKey] as string).replaceAll(CWD, 'CWD');
            const stackTrace = log.err !== undefined ? `\n${(log.err as any).stack.replaceAll(CWD, 'CWD')}` : '';
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

/**
 * Pre-defined pino-pretty `PrettyOptions` for use with console/stream output
 *
 * @source
 * */
export const PRETTY_OPTS_CONSOLE: PrettyOptions = prettyOptsFactory({sync: true})
/**
 * Pre-defined pino-pretty `PrettyOptions` for use with file output
 *
 * @source
 * */
export const PRETTY_OPTS_FILE: PrettyOptions = prettyOptsFactory({
    colorize: false,
    sync: false,
});
