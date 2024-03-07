import {describe} from "mocha";
import {parseLogOptions, Logger, childLogger} from '../src/index.js';
import {PassThrough, Transform} from "node:stream";
import chai, {expect} from "chai";
import {pEvent} from 'p-event';
import {sleep} from "../src/util.js";
import {LogData, LOG_LEVELS} from "../src/types.js";
import withLocalTmpDir from 'with-local-tmp-dir';
import {readdirSync,} from 'node:fs';
import {buildDestinationStream, buildDestinationRollingFile, buildDestinationFile} from "../src/destinations.js";
import {buildLogger} from "../src/loggers.js";
import {readFileSync} from "fs";
import path from "path";


const testConsoleLogger = (config?: object): [Logger, Transform, Transform] => {
    const opts = parseLogOptions(config);
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const logger = buildLogger('debug', [
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
    ]);
    return [logger, testStream, rawStream];
}

const testFileRollingLogger = async (config?: object, logPath: string = '.') => {
    const opts = parseLogOptions(config);
    const streamEntry = await buildDestinationRollingFile(
        opts.file,
        {
            path: logPath,
            ...opts
        }
    );
    return buildLogger('debug', [
        streamEntry
    ]);
};

const testFileLogger = async (config?: object, logPath: string = './app.log') => {
    const opts = parseLogOptions(config);
    const streamEntry = buildDestinationFile(
        opts.file,
        {
            path: logPath,
            ...opts
        }
    );
    return buildLogger('debug', [
        streamEntry
    ]);
};

const testRollingAppLogger = async (config?: object, logPath: string = '.'): Promise<[Logger, Transform, Transform]> => {
    const opts = parseLogOptions(config);
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const streamEntry = await buildDestinationRollingFile(
        opts.file,
        {
            path: logPath,
            ...opts
        }
    );
    const logger = buildLogger('debug', [
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
        },
        buildDestinationStream(opts.console, { destination: 1, colorize: false }),
        streamEntry
    ]);
    return [logger, testStream, rawStream];
}

const testAppLogger = (config?: object, logPath: string = '.'): [Logger, Transform, Transform] => {
    const opts = parseLogOptions(config);
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const streamEntry = buildDestinationFile(
        opts.file,
        {
            path: logPath,
            ...opts
        }
    );
    const logger = buildLogger('debug', [
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
        },
        buildDestinationStream(opts.console, { destination: 1, colorize: false }),
        streamEntry
    ]);
    return [logger, testStream, rawStream];
}

describe('Config Parsing', function () {

    it('does not throw when no arg is given', function () {
        expect(() => parseLogOptions()).to.not.throw;
    })

    it('does not throw when a valid level is given', function () {
        for (const level of LOG_LEVELS) {
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
        expect(defaultConfig.file).eq('info')
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
        expect(config.file).eq('error')
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
            expect(res.toString()).to.include('DEBUG: Test');
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
                expect(readdirSync('.').length).eq(1);
            }, {unsafeCleanup: true});
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
                expect(readdirSync('.').length).eq(1);
            }, {unsafeCleanup: true});
        });
    });

    describe('Combined', function() {
        it('It writes to rolling file and console', async function () {
            await withLocalTmpDir(async () => {
                const logPath = './logs/app.log';
                const [logger, testStream, rawStream] = await testRollingAppLogger({file: 'debug'}, logPath);
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                expect(res).to.not.be.undefined;
                expect(res.toString()).to.include('DEBUG: Test');
                const paths = readdirSync('./logs');
                expect(paths.length).eq(1);
                const fileContents = readFileSync(path.resolve('./logs', paths[0])).toString();
                expect(fileContents).includes('DEBUG: Test');
            }, {unsafeCleanup: true});
        });

        it('It writes to file and console', async function () {
            await withLocalTmpDir(async () => {
                const logPath = './logs/app.log';
                const [logger, testStream, rawStream] = testAppLogger({file: 'debug'}, logPath);
                const race = Promise.race([
                    pEvent(testStream, 'data'),
                    sleep(10)
                ]) as Promise<Buffer>;
                logger.debug('Test');
                await sleep(20);
                const res = await race;
                expect(res).to.not.be.undefined;
                expect(res.toString()).to.include('DEBUG: Test');
                const paths = readdirSync('./logs');
                expect(paths.length).eq(1);
                const fileContents = readFileSync(path.resolve('./logs', paths[0])).toString();
                expect(fileContents).includes('DEBUG: Test');
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
    });
});
