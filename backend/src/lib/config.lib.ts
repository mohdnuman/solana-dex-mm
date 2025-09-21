import _ from "lodash";

import mongoLib from "./mongo.lib";

import configModel from "../model/config.model";

async function getConfig() {
    try {
        const config = await mongoLib.findOne(configModel, {});
        if (_.isEmpty(config)) {
            throw new Error("Config not found");
        }

        return config;
    } catch (error) {
        throw error;
    }
}

export default {
    getConfig: getConfig,
}