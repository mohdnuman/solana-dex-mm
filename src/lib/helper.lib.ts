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

export default {
  sleep: sleep,
  getRandomValue: getRandomValue,
  getRandomElement: getRandomElement,
  getRandomIntegerValue: getRandomIntegerValue,
};
