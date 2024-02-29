import path from "path";
import process from "process";

export const projectDir = process.cwd();
export const configDir: string = path.resolve(projectDir, './config');
let logPath = path.resolve(configDir, `./logs`);
if (typeof process.env.CONFIG_DIR === 'string') {
    logPath = path.resolve(process.env.CONFIG_DIR, './logs');
}

export {
    logPath
}
