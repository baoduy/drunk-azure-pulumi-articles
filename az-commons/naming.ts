import { stack } from "./stackEnv";

/**
 * The method to get resource group name that always add stack name as prefix.
 * */
export const getGroupName = (name: string) => `${stack}-${name}`;

/**
 * The method to get resource name that always add stack name as prefix
 * */
export const getName = (
  name: string,
  suffix: string | undefined = undefined,
) => {
  //remove number form the name
  name = name.replace(/^\d+-/, "");
  return suffix ? `${stack}-${name}-${suffix}` : `${stack}-${name}`;
};
