import * as azure from "@pulumi/azure-native";
import Workspace from "./Workspace";
import AppInsight from "./AppInsight";

export default (
  name: string,
  props: {
    rsGroup: azure.resources.ResourceGroup;
    vault?: azure.keyvault.Vault;
  },
) => {
  const workspace = Workspace(name, props);
  const appInsight = AppInsight(name, { ...props, workspace });

  return { workspace, appInsight };
};
