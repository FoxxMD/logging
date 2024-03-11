import path from "path";
import process from "process";

const projectDir = process.cwd();

const logPathRelative = './logs/app.log';

export {
    logPathRelative,
    projectDir
}
