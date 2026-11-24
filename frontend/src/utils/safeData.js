export const safeArray = (value) =>
  Array.isArray(value) ? value : [];

export const safeObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {};