function getRandomIntegerValue(minValue: number, maxValue: number): number {
    return Math.floor(Math.random() * (maxValue - minValue) + minValue);
}

function getRandomValue(minValue: number, maxValue: number): number {
    return Math.random() * (maxValue - minValue) + minValue;
}

async function sleep(ms: number): Promise<void> {
    // @ts-ignore
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRandomElement(arr: any[]): any {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function retryWrapper<T>(
    fn: (...args: any[]) => Promise<T>,
    args: any[],
    retries: number,
    delay: number
): Promise<T> {
    let attempt = 0;
    while (attempt < retries) {
        try {
            return await fn(...args);
        } catch (error) {
            attempt++;
            if (attempt >= retries) {
                throw error;
            }
            await sleep(delay);
        }
    }
    // This line should never be reached
    throw new Error("Unexpected error in retryWrapper");
}

export default {
    sleep: sleep,
    retryWrapper: retryWrapper,
    getRandomValue: getRandomValue,
    getRandomElement: getRandomElement,
    getRandomIntegerValue: getRandomIntegerValue,
};
