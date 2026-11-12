export const ENVIRONMENT_COUNT = 4;

export function wrapIndex(index: number): number {
  return ((index % ENVIRONMENT_COUNT) + ENVIRONMENT_COUNT) % ENVIRONMENT_COUNT;
}
