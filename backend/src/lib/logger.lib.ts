// @ts-ignore
import logger from 'numan-logger';

function logInfo(message: string | object) {
    logger.logInfo(message);
}

function logError(message: string | object | unknown | Error) {
    logger.logError(message);
}

function logWarning(message: string | object) {
    logger.logWarning(message);
}


export default {
    logInfo: logInfo,
    logError: logError,
    logWarning: logWarning,
}