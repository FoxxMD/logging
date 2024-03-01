import pathUtil from "path";
import {accessSync, constants} from "fs";
import {ErrorWithCause} from "pony-cause";
import process from "process";

export const fileOrDirectoryIsWriteable = (location: string) => {
    const pathInfo = pathUtil.parse(location);
    const isDir = pathInfo.ext === '';
    try {
        accessSync(location, constants.R_OK | constants.W_OK);
        return true;
    } catch (err: any) {
        const {code} = err;
        if (code === 'ENOENT') {
            // walk up path and see if we can access parent directories
            let currPath = pathInfo;
            let parentOK = false;
            let accessError = null;
            while(currPath.dir !== '') {
                try {
                    accessSync(currPath.dir, constants.R_OK | constants.W_OK);
                    parentOK = true;
                    break;
                } catch (e) {
                    if (code !== 'ENOENT') {
                        break;
                        accessError = e;
                    }
                }
                currPath = pathUtil.parse(currPath.dir);
            }
            if(parentOK) {
                return true;
            }
            if (accessError.code === 'EACCES') {
                // also can't access directory :(
                throw new Error(`No ${isDir ? 'directory' : 'file'} exists at ${location} and application does not have permission to write to the parent directory`);
            } else {
                throw new ErrorWithCause(`No ${isDir ? 'directory' : 'file'} exists at ${location} and application is unable to access the parent directory due to a system error`, {cause: accessError});
            }
        } else if (code === 'EACCES') {
            throw new Error(`${isDir ? 'Directory' : 'File'} exists at ${location} but application does not have permission to write to it.`);
        } else {
            throw new ErrorWithCause(`${isDir ? 'Directory' : 'File'} exists at ${location} but application is unable to access it due to a system error`, {cause: err});
        }
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const CWD = process.cwd();
