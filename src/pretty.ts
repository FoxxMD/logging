import {PrettyOptions} from "pino-pretty";
import {CWD} from "./util.js";

export const prettyOptsFactory = (opts: PrettyOptions = {}): PrettyOptions => {
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
        customLevels: {
            verbose: 25,
            log: 21,
        },
        customColors: 'verbose:magenta,log:greenBright',
        colorizeObjects: true,
        // @ts-ignore
        useOnlyCustomProps: false,
        ...opts
    }
}
/**
 * Pre-defined pretty options for use with console/stream output
 *
 * @source
 * */
export const prettyConsole: PrettyOptions = prettyOptsFactory({sync: true})
/**
 * Pre-defined pretty options for use with file output
 *
 * @source
 * */
export const prettyFile: PrettyOptions = prettyOptsFactory({
    colorize: false,
    sync: false,
});
