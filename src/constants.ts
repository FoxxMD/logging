import path from "path";
import process from "process";

const projectDir = process.cwd();

let logPath = path.resolve(projectDir, `./logs/app.log`);

export {
    logPath,
    projectDir
}
