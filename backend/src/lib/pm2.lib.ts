import pm2 from "pm2";
import _ from "lodash";

function connect() {
    try {
        return new Promise<void>((resolve, reject) => {
            pm2.connect(err => (err ? reject(err) : resolve()));
        });
    } catch (error) {
        throw error;
    }
}


async function start(name: string, filePath: string, args: string[] = []) {
    try {
        if (_.isEmpty(name) || _.isEmpty(filePath)) {
            throw new Error(`Missing args! name: ${name}, filePath: ${filePath}`);
        }

        return new Promise((resolve, reject) => {
            pm2.start(
                {
                    script: filePath,
                    name,
                    args
                },
                (err, proc) => {
                    if (err) return reject(err);
                    resolve(proc);
                }
            );
        });
    } catch (error) {
        throw error;
    }
}

async function stop(name: string) {
    try {
        if (_.isEmpty(name)) {
            throw new Error(`Missing args! name: ${name}`);
        }

        return new Promise((resolve, reject) => {
            pm2.stop(name, (err, proc) => {
                if (err) return reject(err);
                resolve(proc);
            });
        });
    } catch (error) {
        throw error;
    }
}

async function remove(name: string) {
    try {
        if (_.isEmpty(name)) {
            throw new Error(`Missing args! name: ${name}`);
        }

        return new Promise((resolve, reject) => {
            pm2.delete(name, (err, proc) => {
                if (err) return reject(err);
                resolve(proc);
            });
        });
    } catch (error) {
        throw error;
    }
}

async function resume(name: string) {
    try {
        if (_.isEmpty(name)) {
            throw new Error(`Missing args! name: ${name}`);
        }

        return new Promise((resolve, reject) => {
            pm2.start({
                name: name
            }, (err, proc) => {
                if (err) return reject(err);
                resolve(proc);
            });
        });
    } catch (error) {
        throw error;
    }
}

async function list() {
    try {
        return new Promise((resolve, reject) => {
            pm2.list((err, list) => {
                if (err) return reject(err);
                resolve(list.map(p => ({
                    name: p.name,
                    pid: p.pid,
                    // @ts-ignore
                    status: p.pm2_env.status,
                })));
            });
        });
    } catch (error) {
        throw error;
    }
}


export default {
    list: list,
    stop: stop,
    start: start,
    resume: resume,
    remove: remove,
    connect: connect
}