/**
 * @param {number|{min: number, max: number}|undefined} value
 * @param {number} fallback
 * @param {Function} [random]
 * @returns {number}
 */
export function resolveRandomRange(value, fallback, random = Math.random) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const min = typeof value.min === 'number' ? value.min : fallback;
    const max = typeof value.max === 'number' ? value.max : min;

    return min + (max - min) * random();
  }

  return fallback;
}