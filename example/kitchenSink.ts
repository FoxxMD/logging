import {childLogger, loggerApp, loggerDebug} from '../src/index.js'
import process from "process";
import path from 'path';

const initLogger = childLogger(loggerDebug, 'Init');
initLogger.info('Initializing Application -> v1.3.1');
initLogger.debug('Debug logging is enabled!');
initLogger.debug(`Found Log Config at ${path.resolve(process.cwd(), './config.yaml')}`)

const appLogger = loggerApp({file: false});
const logger = childLogger(appLogger, 'App');
logger.verbose(`Logging to -> ${path.resolve(process.cwd(), './logs/app.log')}`);

const nestedChild1 = childLogger(logger, 'Service A');
nestedChild1.log('Starting monitoring for events...');

const nestedChild2 = childLogger(nestedChild1, ['Queue', 'Parser']);
nestedChild2.warn('Unexpected contents found in event, skipping');

const siblingLogger = childLogger(logger, ['Service B', 'Manager']);
siblingLogger.info('Widget allocation has initiated');

logger.debug({myProp: 'a string', nested: {anotherProps: ['val1', 'val2'], boolProp: true}}, 'Test');

const er = new Error('A configuration error occurred');
const causeErr = new Error('Service C did not start', {cause: er});
logger.error(causeErr);

logger.verbose('(1) service failed to start but is non-essential...continuing startup')
logger.info('Application successfully started and running!')
