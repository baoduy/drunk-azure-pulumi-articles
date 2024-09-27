import { stack } from "./stackEnv";

/**
 * Retrieves the resource group name with the stack name as a prefix.
 * 
 * @param {string} name - The base name of the resource group.
 * @returns {string} - The resource group name prefixed with the stack name.
 */
export const getGroupName = (name: string) => `${stack}-${name}`;

/**
 * Retrieves the resource name with the stack name as a prefix.
 * 
 * @param {string} name - The base name of the resource.
 * @param {string} [suffix] - An optional suffix to append to the resource name.
 * @returns {string} - The resource name prefixed with the stack name and optionally suffixed.
 * 
 * @example
 * // returns "stackName-resourceName"
 * getName("resourceName");
 * 
 * @example
 * // returns "stackName-resourceName-suffix"
 * getName("resourceName", "suffix");
 */
export const getName = (
  name: string,
  suffix: string | undefined = undefined,
) => {
  // Remove leading numbers and hyphen from the name
  name = name.replace(/^\d+-/, "");
  return suffix ? `${stack}-${name}-${suffix}` : `${stack}-${name}`;
};