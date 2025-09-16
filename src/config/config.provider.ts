import fs from "fs";

export default class ConfigProvider {
    filePath: string;
    config: {
        dex: string;
        tokenAddress: string;
        poolAddress: string;
        wallets: object[];
        bias: number;
        tradesPerCycle: number;
        volumePerMinute: number;
    }

    constructor(filePath: string) {
        this.filePath = filePath;

        if (!fs.existsSync(this.filePath)) {
            throw new Error(`Config file not found at path: ${this.filePath}`);
        }

        const data = fs.readFileSync(this.filePath, "utf8");
        this.config = JSON.parse(data);
    }

    save = (): void => {
        fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2));
    }

    getConfig = (): any => {
        return {...this.config};
    }

    updateConfig = (newValues: any): void => {
        this.config = {...this.config, ...newValues};
        this.save();
    }
}
