/**
 * Helper utility for safely extracting single string values from Express
 * route parameters or query string parameters (which can be string | string[] | undefined).
 */
export const getQueryString = (
  value: string | string[] | undefined | unknown
): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};
