import pathUtil from "path";
import {accessSync, constants} from "fs";
import process from "process";

export const pathIsWriteable = (location: string) => {
    const pathInfo = pathUtil.parse(location);
    const isDir = pathInfo.ext === '';

    // first try location directly
    try {
        testHumanAccess(location);
        return true;
    } catch (e) {
        if(e.cause === undefined || e.cause.code !== 'ENOENT') {
            // no permissions to file/folder or some other error
            throw e;
        }
    }

    // now we'll try walking up all parent directories until we find either:
    //
    // one that exists and is writeable (OK! we can write all subdirectories)
    // one that exists and is NOT writeable (cannot create subdirectories)
    // root directory (oh no)
    // some other system error
    let currPath = pathInfo;
    try {
        while (currPath.dir !== '' && currPath.dir !== '/') {
            try {
                testHumanAccess(currPath.dir);
                return true;
            } catch (e) {
                if (e.cause === undefined || e.cause.code !== 'ENOENT') {
                    throw e;
                }
                currPath = pathUtil.parse(currPath.dir);
            }
        }
    } catch (e) {
        if (e.cause?.code === 'EACCES') {
            // also can't access directory :(
            throw new Error(`No ${isDir ? 'directory' : 'file'} exists at ${location} and application does not have read or write permissions to a parent directory`,{cause: e});
        } else {
            throw new Error(`No ${isDir ? 'directory' : 'file'} exists at ${location} and application is unable to access a parent directory due to a system error`, {cause: e});
        }
    }

    // walked all parent dirs without reaching any that existed until we go to top-level!
    throw new Error(`No ${isDir ? 'directory' : 'file'} exists at ${location} and no parent directories existed all the way to root directory!`);
}

const testHumanAccess = (location: string) => {
    const pathInfo = pathUtil.parse(location);
    const isDir = pathInfo.ext === '';
    try {
        accessSync(location, constants.R_OK | constants.W_OK);
    } catch (e) {
        switch(e.code) {
            case 'ENOENT':
                throw new Error(`No ${isDir ? 'directory' : 'file'} exists at ${location}`, {cause: e});
            case 'EACCES':
                throw new Error(`Permission denied to ${isDir ? 'directory' : 'file'} at ${location}`, {cause: e});
            default:
                throw new Error(`System error occurred while trying to access ${isDir ? 'directory' : 'file'} at ${location}`, {cause: e});
        }
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const CWD = process.cwd();

export const getLongestStr = (levels: string[]): number => {
    let longest = 0;
    for (const l of levels) {
        if (l.length > longest) {
            longest = l.length;
        }
    }
    return longest;
}

export function parseBool<T = undefined>(value: any, defaultVal: T = undefined): boolean | T {
    if (value === undefined || value === '') {
        return defaultVal
    }
    if (typeof value === 'string') {
        return ['1','true','yes'].includes(value.toLocaleLowerCase().trim());
    } else if (typeof value === 'boolean') {
        return value;
    }
    throw new Error(`'${value.toString()}' is not a boolean value.`);
}
