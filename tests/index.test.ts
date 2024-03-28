import {describe} from "mocha";
import {
    parseLogOptions,
    Logger,
    childLogger,
    LogOptions,
    LoggerAppExtras,
    LogLevelStreamEntry, loggerAppRolling, loggerApp
} from '../src/index.js';
import {PassThrough, Transform} from "node:stream";
import chai, {expect} from "chai";
import {pEvent} from 'p-event';
import {sleep} from "../src/util.js";
import { LogData, LOG_LEVEL_NAMES, PRETTY_ISO8601, FileLogPathOptions } from "../src/types.js";
import withLocalTmpDir from 'with-local-tmp-dir';
import {readdirSync,} from 'node:fs';
import {
    buildDestinationStream,
    buildDestinationRollingFile,
    buildDestinationFile,
    buildDestinationJsonPrettyStream
} from "../src/destinations.js";
import {buildLogger} from "../src/loggers.js";
import {readFileSync} from "fs";
import path from "path";
import dateFormatDef from "dateformat";

const dateFormat = dateFormatDef as unknown as typeof dateFormatDef.default;


const testConsoleLogger = (config?: object, colorize = false): [Logger, Transform, Transform] => {
    const opts = parseLogOptions(config, {logBaseDir: process.cwd()});
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const logger = buildLogger('debug', [
        buildDestinationStream(
            opts.console,
            {
                destination: testStream,
                colorize,
                ...opts
            }
        ),
        {
            level: opts.console,
            stream: rawStream
        }
    ]);
    return [logger, testStream, rawStream];
}

const testObjectLogger = (config?: object, object?: boolean): [Logger, Transform, Transform] => {
    const opts = parseLogOptions(config, {logBaseDir: process.cwd()});
    const testStream = new PassThrough({objectMode: true});
    const rawStream = new PassThrough();
    const logger = buildLogger('debug', [
        buildDestinationJsonPrettyStream(
            opts.console,
            {
                destination: testStream,
                object,
                colorize: false,
                ...opts
            }
        ),
        {
            level: opts.console,
            stream: rawStream
        }
    ]);
    return [logger, testStream, rawStream];
}

const testFileRollingLogger = async (config?: object, options: FileLogPathOptions = {}) => {
    const fileOpts: FileLogPathOptions = {
        logBaseDir: process.cwd(),
        ...options
    }
    const opts = parseLogOptions(config, fileOpts);
    const {
        file: {
            level,
            path: logPath,
            frequency,
            ...rest
        } = {}
    } = opts;
    const streamEntry = await buildDestinationRollingFile(
        level,
        {
            frequency,
            path: logPath,
            ...opts,
            ...rest
        }
    );
    return buildLogger('debug', [
        streamEntry
    ]);
};

const testFileLogger = async (config?: object, options: FileLogPathOptions = {}) => {
    const fileOpts: FileLogPathOptions = {
        logBaseDir: process.cwd(),
        ...options
    }
    const opts = parseLogOptions(config, fileOpts);
    const {
        file: {
            path: logPath,
            level,
            ...rest
        } = {}
    } = opts;
    const streamEntry = buildDestinationFile(
        level,
        {
            path: logPath,
            ...opts,
            ...rest
        }
    );
    return buildLogger('debug', [
        streamEntry
    ]);
};

const testRollingAppLogger = async (config: LogOptions | object = {}, extras: LoggerAppExtras = {}): Promise<[Logger, Transform, Transform]> => {
    const {destinations = [], pretty, logBaseDir, ...restExtras} = extras;
    const opts = parseLogOptions(config, {logBaseDir: process.cwd(), ...extras});
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const streams: LogLevelStreamEntry[] = [
        buildDestinationStream(
            opts.console,
            {
                destination: testStream,
                colorize: false,
                ...opts
            }
        ),
        {
            level: opts.console,
            stream: rawStream
        }
    ];
    const logger = await loggerAppRolling({...opts, console: 'silent'}, {destinations: [...destinations, ...streams], pretty, logBaseDir, ...restExtras});
    return [logger, testStream, rawStream];
}

const testAppLogger = (config: LogOptions | object = {}, extras: LoggerAppExtras = {}): [Logger, Transform, Transform] => {
    const {destinations = [], pretty = {}, logBaseDir, ...restExtras} = extras;
    const opts = parseLogOptions(config, {logBaseDir: process.cwd(), ...extras});
    const testStream = new PassThrough();
    const rawStream = new PassThrough();


    const streams = [
        buildDestinationStream(
            opts.console,
            {
                ...pretty,
                destination: testStream,
                colorize: false,
                ...opts,
            }
        ),
        {
            level: opts.console,
            stream: rawStream
        },
    ];
    const logger = loggerApp({...opts, console: 'silent'}, {destinations: [...destinations, ...streams], pretty, logBaseDir, ...restExtras});
    return [logger, testStream, rawStream];
}

describe('Config Parsing', function () {

    it('does not throw when no arg is given', function () {
        expect(() => parseLogOptions()).to.not.throw;
    })

    it('does not throw when object contains unknown properties', function () {
        // @ts-expect-error
        expect(() => parseLogOptions({extraProp: 'test'})).to.not.throw;
    })

    it('does not throw when a valid level is given', function () {
        for (const level of LOG_LEVEL_NAMES) {
            expect(() => parseLogOptions({level})).to.not.throw;
        }
    })

    it('throws when an invalid level is given', function () {
        // @ts-expect-error
        expect(() => parseLogOptions({level: 'nah'})).to.throw;
        // @ts-expect-error
        expect(() => parseLogOptions({file: 'nah'})).to.throw;
        // @ts-expect-error
        expect(() => parseLogOptions({console: 'nah'})).to.throw;
    })

    it('throws when an option is not a string/boolean', function () {
        // @ts-expect-error
        expect(() => parseLogOptions({console: {level: 'info'}})).to.throw;
    })

    it('throws when file option is not a string/false', function () {
        // @ts-expect-error
        expect(() => parseLogOptions({file: true})).to.throw;
    })

    it(`defaults to 'info' level except console`, function () {
        const defaultConfig = parseLogOptions();
        expect(defaultConfig.level).eq('info')
        expect(defaultConfig.file.level).eq('info')
    });

    it(`defaults to 'debug' level for console`, function () {
        const defaultConfig = parseLogOptions();
        expect(defaultConfig.console).eq('debug')
    });

    it(`uses level for option when given`, function () {
        const config = parseLogOptions({
            file: 'error',
            console: 'warn',
            level: 'debug'
        });
        expect(config.console).eq('warn')
        expect(config.file.level).eq('error')
    });

    describe('Log File Options', function() {

        it(`uses CWD for base path when none is specified`, async function () {
            const config = parseLogOptions({
                level: 'debug'
            });
            expect(config.file.path).includes(process.cwd())
        });

        it(`uses user-specified base path when specified`, async function () {
            await withLocalTmpDir(async () => {
                const config = parseLogOptions({
                    level: 'debug'
                }, {logBaseDir: process.cwd()});
                expect(config.file.path).includes(process.cwd())
            }, {unsafeCleanup: false});
        });

        it(`uses 'logs/app.log' for default log path when none is specified`, async function () {
            const config = parseLogOptions({
                level: 'debug'
            });
            expect(config.file.path).includes('logs/app.log')
        });

        it(`uses user-specified default log path when none is specified`, async function () {
            const config = parseLogOptions({
                level: 'debug',
            }, {logDefaultPath: 'logs/myApp.log'});
            expect(config.file.path).includes('logs/myApp.log')
        });

        it(`uses config-specified absolute path`, async function () {
            const specificPath = '/my/absolute/path/app.log';
            const config = parseLogOptions({
                level: 'debug',
                file: {
                    path:  specificPath
                }
            });
            expect(config.file.path).eq(specificPath)
        });

        it(`uses config-specified relative path with base path`, async function () {
            const relativePath = './my/relative/path/app.log';
            const config = parseLogOptions({
                level: 'debug',
                file: {
                    path:  relativePath
                }
            });
            expect(config.file.path).eq(path.join(process.cwd(), relativePath));

            const configWithDefault = parseLogOptions({
                level: 'debug',
                file: {
                    path:  relativePath
                }
            }, {logDefaultPath: 'logs/myApp.log'});
            expect(configWithDefault.file.path).eq(path.join(process.cwd(), relativePath));
        });

        it(`uses ENV-specified path`, async function () {
            const specificPath = '/my/absolute/path/app.log';
            process.env.LOG_PATH = specificPath;
            const config = parseLogOptions({
                level: 'debug',
            });
            delete process.env.LOG_PATH;
            expect(config.file.path).eq(specificPath)
        });
    });
})

describe('Transports', function () {
    describe('Console', function () {

        it('Writes to console with DEBUG with default config', async function () {
            const [defaultLogger, testStream] = testConsoleLogger();
            const race = Promise.race([
                pEvent(testStream, 'data'),
                sleep(10)
            ]) as Promise<Buffer>;
            defaultLogger.debug('Test');
            const res = await race;
            expect(res).to.not.be.undefined;
            expect(res.toString().match(/DEBUG\s*:\s*Test/)).is.not.null;
        });

        it('Does NOT write to console with DEBUG when higher level is specified', async function () {
            const [defaultLogger, testStream] = testConsoleLogger({level: 'info'});
            const race = Promise.race([
                pEvent(testStream, 'data'),
                sleep(10)
            ]) as Promise<Buffer>;
            defaultLogger.debug('Test');
            const res = await race;
            expect(res).to.be.undefined;
        });
    });

    describe('Pretty Object Stream', function () {
        it('Writes pretty line to stream as jsonified object', async function () {
            const [defaultLogger, testStream] = testObjectLogger(undefined, false);
            const race = Promise.race([
                pEvent(testStream, 'data'),
                sleep(10)
            ]) as Promise<object>;
            defaultLogger.debug('Test');
            const res = (await race).toString();
            expect(res).to.not.be.undefined;
            expect(res).match(/"line":".*\sDEBUG\s*:\s*Test"/).is.not.null;
        });

        it('Writes pretty line to stream as object', async function () {
            const [defaultLogger, testStream] = testObjectLogger(undefined, true);
            const race = Promise.race([
                pEvent(testStream, 'data'),
                sleep(10)
            ]) as Promise<LogData>;
            defaultLogger.debug('Test');
            const res = await race;
            expect(res).to.not.be.undefined;
            expect(res.line).to.not.be.undefined;
            expect(res.line).match(/DEBUG\s*:\s*Test/).is.not.null;
        });
    });

    describe('File', async function () {

        it('Does NOT write to file when file is false', async function () {
            await withLocalTmpDir(async () => {
                const logger = await  testFileLogger({file: false});
                logger.debug('Test');
                await sleep(20);
                expect(readdirSync('.').length).eq(0);
            }, {unsafeCleanup: false});
        });

        it('Writes to file when file level is valid', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileLogger({file: 'debug'});
                logger.debug('Test');
                await sleep(20);
                expect(readdirSync('./logs').length).eq(1);
            }, {unsafeCleanup: true});
        });

        it('Writes to specified file path', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileLogger({file: { path: './myLogs.log' }});
                logger.debug('Test');
                await sleep(20);
                const files = readdirSync('.');
                expect(files.length).eq(1);
                expect(files[0]).eq('myLogs.log')
            }, {unsafeCleanup: true});
        });
    });

    describe('Rolling File', async function () {

        it('Does NOT write to file when file is false', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileRollingLogger({file: false});
                logger.debug('Test');
                await sleep(20);
                expect(readdirSync('.').length).eq(0);
            }, {unsafeCleanup: false});
        });

        it('Writes to file when file level is valid', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileRollingLogger({file: 'debug'});
                logger.debug('Test');
                await sleep(20);
                expect(readdirSync('./logs').length).eq(1);
            }, {unsafeCleanup: true});
        });

        it('Writes to specified file', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileRollingLogger({file: { path: './myLogs.log' }});
                logger.debug('Test');
                await sleep(20);
                const files = readdirSync('.');
                expect(files.length).eq(1);
                expect(files[0]).includes('myLogs')
            }, {unsafeCleanup: true});
        });

        it('Writes to specified file with string function', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileRollingLogger({file: { path: () => path.resolve(process.cwd(), './logs/thisFile.log') }});
                logger.debug('Test');
                await sleep(20);
                const files = readdirSync('./logs');
                expect(files.length).eq(1);
                expect(files[0]).eq('thisFile.1.log')
            }, {unsafeCleanup: true});
        });

        it('Does not write frequency pattern if only size is specified', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileRollingLogger({file: { path: './myLogs.log', size: '10M' }});
                logger.debug('Test');
                await sleep(20);
                const files = readdirSync('.');
                expect(files.length).eq(1);
                expect(files[0]).eq('myLogs.1.log')
            }, {unsafeCleanup: true});
        });

        describe('Frequency', function() {

            it('Writes to specified file with daily frequency when timestamp is auto', async function () {
                const dt = new Date().toISOString().split('T')[0];
                await withLocalTmpDir(async () => {
                    const logger = await testFileRollingLogger({file: { path: './myLogs.log', frequency: 'daily' }});
                    logger.debug('Test');
                    await sleep(20);
                    const files = readdirSync('.');
                    expect(files.length).eq(1);
                    expect(files[0]).eq(`myLogs-${dt}.1.log`)
                }, {unsafeCleanup: true});
            });

            it('Writes to specified file with iso for other frequencies when timestamp is auto', async function () {
                const dt = new Date().toISOString().substring(0, 19);
                await withLocalTmpDir(async () => {
                    const logger = await testFileRollingLogger({file: { path: './myLogs.log', frequency: 'hourly' }});
                    logger.debug('Test');
                    await sleep(20);
                    const files = readdirSync('.');
                    expect(files.length).eq(1);
                    expect(files[0]).includes(`myLogs-${dt}`)
                }, {unsafeCleanup: true});
            });

            it('Writes to specified file with unix timestamp when configured', async function () {
                const dt = Date.now().toString().substring(0,11);
                await withLocalTmpDir(async () => {
                    const logger = await testFileRollingLogger({file: { path: './myLogs.log', frequency: 'hourly', timestamp: 'unix' }});
                    logger.debug('Test');
                    await sleep(20);
                    const files = readdirSync('.');
                    expect(files.length).eq(1);
                    expect(files[0]).includes(`myLogs-${dt}`)
                }, {unsafeCleanup: true});
            });

            it('Writes to specified file with iso when timestamp is iso', async function () {
                const dt = new Date().toISOString().substring(0, 19);
                await withLocalTmpDir(async () => {
                    const logger = await testFileRollingLogger({file: { path: './myLogs.log', frequency: 'daily', timestamp: 'iso' }});
                    logger.debug('Test');
                    await sleep(20);
                    const files = readdirSync('.');
                    expect(files.length).eq(1);
                    expect(files[0]).includes(`myLogs-${dt}`)
                }, {unsafeCleanup: true});
            });
        });
    });

    describe('Combined', function() {
        it('It writes to rolling file and console', async function () {
            await withLocalTmpDir(async () => {
                const [logger, testStream, rawStream] = await testRollingAppLogger({file: 'debug'});
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                expect(res).to.not.be.undefined;
                expect(res.toString().match(/DEBUG\s*:\s*Test/)).is.not.null;
                const paths = readdirSync('./logs');
                expect(paths.length).eq(1);
                const fileContents = readFileSync(path.resolve('./logs', paths[0])).toString();
                expect(fileContents.match(/DEBUG\s*:\s*Test/)).is.not.null;
            }, {unsafeCleanup: true});
        });

        it('It writes to file and console', async function () {
            await withLocalTmpDir(async () => {
                const [logger, testStream, rawStream] = testAppLogger({file: 'debug'});
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                expect(res).to.not.be.undefined;
                expect(res.toString().match(/DEBUG\s*:\s*Test/)).is.not.null
                const paths = readdirSync('./logs');
                expect(paths.length).eq(1);
                const fileContents = readFileSync(path.resolve('./logs', paths[0])).toString();
                expect(fileContents.match(/DEBUG\s*:\s*Test/)).is.not.null;
            }, {unsafeCleanup: true});
        });

        it('It writes to file with a different base dir', async function () {
            await withLocalTmpDir(async () => {
                const [logger, testStream, rawStream] = testAppLogger({file: 'debug'}, {logBaseDir: path.resolve(process.cwd(), './config/logs')});
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                const paths = readdirSync('./config/logs');
                expect(paths.length).eq(1);
            }, {unsafeCleanup: true});
        });

        it('It writes to file with a different default log path', async function () {
            await withLocalTmpDir(async () => {
                const [logger, testStream, rawStream] = testAppLogger({file: 'debug'}, {logDefaultPath: './myApp.log'});
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                const paths = readdirSync('.');
                expect(paths.length).eq(1);
                expect(paths[0]).includes('myApp.log');
            }, {unsafeCleanup: true});
        });
    });
});

describe('Child Logger', function() {

    describe('Arguments', function() {
        it('has no labels when none are provided', function() {
            const [logger] = testConsoleLogger();
            const child = childLogger(logger);
            expect(child.labels.length).eq(0);
        });

        it('has labels when provided as string', function() {
            const [logger] = testConsoleLogger();
            const child = childLogger(logger, 'test');
            expect(child.labels.length).eq(1);
        });

        it('has labels when provided as array', function() {
            const [logger] = testConsoleLogger();
            const child = childLogger(logger, ['test','test2']);
            expect(child.labels.length).eq(2);
        });
    });

    describe('Labels', function() {
        it('outputs labels', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');
            const child = childLogger(logger, 'Test');
            child.debug('log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Test] ');
            expect(raw.labels).is.not.undefined;
            expect(raw.labels.length).eq(1);
            expect(raw.labels[0]).eq('Test');
        });

        it('outputs multiple labels', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');
            const child = childLogger(logger, ['Test1', 'Test2']);
            child.debug('log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Test1] [Test2] ');
            expect(raw.labels).is.not.undefined;
            expect(raw.labels.length).eq(2);
            expect(raw.labels[0]).eq('Test1');
            expect(raw.labels[1]).eq('Test2');
        });

        it('merges labels from nested children', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');
            const child = childLogger(logger, ['Test1', 'Test2']);
            const child2 = childLogger(child, ['Test3', 'Test4']);
            const child3 = childLogger(child2, ['Test5']);
            child3.debug('log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Test1] [Test2] [Test3] [Test4] [Test5]');
            expect(raw.labels).is.not.undefined;
            expect(raw.labels.length).eq(5);
            expect(raw.labels[0]).eq('Test1');
            expect(raw.labels[1]).eq('Test2');
            expect(raw.labels[2]).eq('Test3');
            expect(raw.labels[3]).eq('Test4');
            expect(raw.labels[4]).eq('Test5');
        });

        it('merges labels from log call with logger labels', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');

            logger.addLabel('Parent');
            const child = childLogger(logger, ['Test1']);
            child.debug({labels: ['Runtime']},'log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Parent] [Test1]');
            expect(formatted).includes(' [Runtime] ');
        });

        it('child labels do not affect parent logger labels', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');

            logger.addLabel('Parent');
            const child = childLogger(logger, ['Test1']);
            logger.debug('log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Parent] ');
            expect(formatted).not.includes(' [Test1] ');
        });

        it('merges labels when provided to log function in info object', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');

            logger.addLabel('Parent');
            logger.debug({labels: ['Runtime']},'log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            expect(formatted).includes(' [Parent] ');
            expect(formatted).includes(' [Runtime] ');
        });
    });
});

describe('Pretty Features', function () {
    const [logger, testStream, rawStream] = testConsoleLogger(undefined, true);
    it('colors error stack traces', async function () {
        const formattedBuff = pEvent(testStream, 'data');

        const rootError = new Error('The root error message');
        const topError = new Error('The top error message', {cause: rootError});

        logger.error(topError);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).to.not.be.undefined;
        expect(formatted.match(/^\s+at\s.+$/gm)).to.be.null;
    });
});

describe('Pretty Options', function() {
    it('Redacts CWD by default', async function () {
        const [logger, testStream, rawStream] = testAppLogger({file: false});
        const formattedBuff = pEvent(testStream, 'data');
        const rawBuff = pEvent(rawStream, 'data');
        const subPath = '/a/subfolder/to/file.txt';
        const cwdPath = path.join(process.cwd(), subPath);

        logger.debug(`An example with current working directory substr ${cwdPath}`);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).does.not.includes(process.cwd());
        expect(formatted).includes(`${path.join('CWD', subPath)}`);
    });

    it('Retains CWD when configured', async function () {
        const [logger, testStream, rawStream] = testAppLogger({file: false}, {pretty: {redactCwd: false}});
        const formattedBuff = pEvent(testStream, 'data');
        const subPath = '/a/subfolder/to/file.txt';
        const cwdPath = path.join(process.cwd(), subPath);

        logger.debug(`An example with current working directory substr ${cwdPath}`);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).includes(cwdPath);
    });

    it('Pads levels by default', async function () {
        const [logger, testStream, rawStream] = testAppLogger({file: false});
        const formattedBuff = pEvent(testStream, 'data');
        const rawBuff = pEvent(rawStream, 'data');

        logger.debug(`Test padding`);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).includes('DEBUG  :');
    });

    it('Does not Pad levels when configured', async function () {
        const [logger, testStream, rawStream] = testAppLogger({file: false}, {pretty: {padLevels: false}});
        const formattedBuff = pEvent(testStream, 'data');
        const rawBuff = pEvent(rawStream, 'data');

        logger.debug(`Test padding`);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).includes('DEBUG:');
    });

    it('ISO Pretty format prints correctly', async function () {
        const [logger, testStream, rawStream] = testAppLogger({file: false}, {pretty: {translateTime: PRETTY_ISO8601}});
        const formattedBuff = pEvent(testStream, 'data');

        const dt = dateFormat(new Date(), 'isoDateTime').substring(0, 19);
        logger.debug(`Test iso timestamp`);
        await sleep(10);
        const formatted = (await formattedBuff).toString();
        expect(formatted).includes(dt);
    });
});
