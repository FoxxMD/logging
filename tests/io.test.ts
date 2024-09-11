import {describe} from "mocha";
import {expect} from "chai";
import withLocalTmpDir from 'with-local-tmp-dir';
import {mkdir, writeFile, chmod, constants} from 'node:fs/promises';
import path from "path";
import { pathIsWriteable } from "../src/util.js";

describe('Path Access', function () {

    it(`does not throw when file is writeable`, async function () {
        await withLocalTmpDir(async () => {
            await writeFile(path.join(process.cwd(), 'test.log'), '' );
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test.log'))).to.not.throw();
        }, {unsafeCleanup: true});
    });

    it(`does not throw when file does not exist but parent directories can be created`, async function () {
        await withLocalTmpDir(async () => {
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test/subfolder/another/test.log'))).to.not.throw();
        }, {unsafeCleanup: true});
    });

    it(`does not throw when directory is read-only but file is writable`, async function () {
        await withLocalTmpDir(async () => {
            await mkdir(path.join(process.cwd(), 'test'));
            await writeFile(path.join(process.cwd(), 'test/test.log'), '');
            await chmod(path.join(process.cwd(), 'test'), '555');
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test/test.log'))).to.not.throw();

            //cleanup
            await chmod(path.join(process.cwd(), 'test'), '777');
            await chmod(path.join(process.cwd(), 'test/test.log'), '777');
        }, {unsafeCleanup: true});
    });

    it(`throws when file is read-only`, async function () {
        await withLocalTmpDir(async () => {
            await mkdir(path.join(process.cwd(), 'test'));
            await writeFile(path.join(process.cwd(), 'test/test.log'), '', {mode: 333});
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test/test.log'))).to.throw();

            //cleanup
            await chmod(path.join(process.cwd(), 'test'), '777');
            await chmod(path.join(process.cwd(), 'test/test.log'), '777');
        }, {unsafeCleanup: true});
    });

    it(`throws when directory is read-only`, async function () {
        await withLocalTmpDir(async () => {
            await mkdir(path.join(process.cwd(), 'test'), {mode: '444', recursive: true});
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test'))).to.throw();

            //cleanup
            await chmod(path.join(process.cwd(), 'test'), '777');
        }, {unsafeCleanup: true});
    });

    it(`throws when file does not exist and a parent directory is not accessible`, async function () {
        await withLocalTmpDir(async () => {
            await mkdir(path.join(process.cwd(), 'test'), {mode: '555'});
            expect(() => pathIsWriteable(path.join(process.cwd(), 'test/subfolder/test.log'))).to.throw();

            // cleanup
            await chmod(path.join(process.cwd(), 'test'), '777');
        }, {unsafeCleanup: true});
    });

    it(`throws when currently walked parent dir is root dir`, async function () {
        expect(() => pathIsWriteable(path.join('/nonExistent/test.log'))).to.throw();
    });
})
