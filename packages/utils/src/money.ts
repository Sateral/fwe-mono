export function toMinorUnits(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100);
}

export function fromMinorUnits(amount: number): number {
  return amount / 100;
}

export function addMoney(...amounts: number[]): number {
  return fromMinorUnits(
    amounts.reduce((sum, value) => sum + toMinorUnits(value), 0),
  );
}
