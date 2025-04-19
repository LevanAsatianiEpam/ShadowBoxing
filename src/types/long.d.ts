declare module "long" {
  export default class Long {
    constructor(low: number, high: number, unsigned?: boolean);
    toString(): string;
    toNumber(): number;
  }
}