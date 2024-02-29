import {describe} from "mocha";
import {buildParsedLogOptions, LabelledLogger, loggers} from '../src/index.js';
import {buildPinoConsoleStream, buildPinoFileStream, buildPinoLogger, createChildLogger} from "../src/funcs.js";
import {PassThrough, Transform} from "node:stream";
import chai, {expect} from "chai";
import {pEvent} from 'p-event';
import {sleep} from "../src/util.js";
import {LogData, logLevels} from "../src/types.js";
import withLocalTmpDir from 'with-local-tmp-dir';
import {readdirSync,} from 'node:fs';


const testConsoleLogger = (config?: object): [LabelledLogger, Transform, Transform] => {
    const opts = buildParsedLogOptions(config);
    const testStream = new PassThrough();
    const rawStream = new PassThrough();
    const logger = buildPinoLogger('debug', [
        buildPinoConsoleStream(
            {
                stream: testStream,
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

const testFileLogger = async (config?: object) => {
    const streamEntry = await buildPinoFileStream(
        {
            path: '.',
            ...buildParsedLogOptions(config)
        }
    );
    return buildPinoLogger('debug', [
        streamEntry
    ]);
};

describe('Config Parsing', function () {

    it('does not throw when no arg is given', function () {
        expect(() => buildParsedLogOptions()).to.not.throw;
    })

    it('does not throw when a valid level is given', function () {
        for (const level of logLevels) {
            expect(() => buildParsedLogOptions({level})).to.not.throw;
        }
    })

    it('throws when an invalid level is given', function () {
        expect(() => buildParsedLogOptions({level: 'nah'})).to.throw;
        expect(() => buildParsedLogOptions({file: 'nah'})).to.throw;
        expect(() => buildParsedLogOptions({console: 'nah'})).to.throw;
    })

    it('throws when an option is not a string/boolean', function () {
        expect(() => buildParsedLogOptions({console: {level: 'info'}})).to.throw;
    })

    it('throws when file option is not a string/false', function () {
        expect(() => buildParsedLogOptions({file: true})).to.throw;
    })

    it(`defaults to 'info' level except console`, function () {
        const defaultConfig = buildParsedLogOptions();
        expect(defaultConfig.level).eq('info')
        expect(defaultConfig.file).eq('info')
    });

    it(`defaults to 'debug' level for console`, function () {
        const defaultConfig = buildParsedLogOptions();
        expect(defaultConfig.console).eq('debug')
    });

    it(`uses level for option when given`, function () {
        const config = buildParsedLogOptions({
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

    describe('File', async function () {

        it('Does NOT write to file when file is false', async function () {
            await withLocalTmpDir(async () => {
                const logger = await testFileLogger({file: false});
                logger.debug('Test');
                await sleep(20);
                expect(readdirSync('.').length).eq(0);
            }, {unsafeCleanup: false});
        });

        // it('Writes to file when file level is valid', async function () {
        //     await withLocalTmpDir(async () => {
        //         const logger = await testFileLogger({file: 'debug'});
        //         logger.debug('Test');
        //         await sleep(20);
        //         expect(readdirSync('.').length).eq(1);
        //     }, {unsafeCleanup: true});
        // });
    });
});

describe('Child Logger', function() {

    describe('Arguments', function() {
        it('has no labels when none are provided', function() {
            const [logger] = testConsoleLogger();
            const child = createChildLogger(logger);
            expect(child.labels.length).eq(0);
        });

        it('has labels when provided as string', function() {
            const [logger] = testConsoleLogger();
            const child = createChildLogger(logger, 'test');
            expect(child.labels.length).eq(1);
        });

        it('has labels when provided as array', function() {
            const [logger] = testConsoleLogger();
            const child = createChildLogger(logger, ['test','test2']);
            expect(child.labels.length).eq(2);
        });
    });

    describe('Labels', function() {
        it('outputs labels', async function () {
            const [logger, testStream, rawStream] = testConsoleLogger();
            const formattedBuff = pEvent(testStream, 'data');
            const rawBuff = pEvent(rawStream, 'data');
            const child = createChildLogger(logger, 'Test');
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
            const child = createChildLogger(logger, ['Test1', 'Test2']);
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
            const child = createChildLogger(logger, ['Test1', 'Test2']);
            const child2 = createChildLogger(child, ['Test3', 'Test4']);
            const child3 = createChildLogger(child2, ['Test5']);
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
            const child = createChildLogger(logger, ['Test1']);
            logger.debug('log something');
            await sleep(10);
            const formatted = (await formattedBuff).toString();
            const raw = JSON.parse((await rawBuff).toString()) as LogData;
            expect(formatted).includes(' [Parent] ');
            expect(formatted).not.includes(' [Test1] ');
        });
    });
});
