import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure-native";

// Retrieve the current Azure client configuration
const config = pulumi.output(azure.authorization.getClientConfig());

// Export the tenant ID from the Azure client configuration
export const tenantId = config.apply((c) => c.tenantId);

// Export the subscription ID from the Azure client configuration
export const subscriptionId = config.apply((c) => c.subscriptionId);

// Export the object ID of the current principal (user or service principal)
export const currentPrincipal = config.apply((c) => c.objectId);

// Parse the Pulumi configuration from the environment variable
const env = JSON.parse(process.env.PULUMI_CONFIG ?? "{}");

// Export the current Azure region code, defaulting to "SoutheastAsia" if not set
export const currentRegionCode = env["azure-native:config:location"]!;

//Parse resource info from ID
export const getResourceInfoFromId = (id: string) => {
  const details = id.trim().split("/");
  let name = "";
  let groupName = "";
  let subId = "";

  details.forEach((d, index) => {
    if (d === "subscriptions") subId = details[index + 1];
    if (d === "resourceGroups" || d === "resourcegroups")
      groupName = details[index + 1];
    if (index === details.length - 1) name = d;
  });

  return {
    name,
    id,
    resourceGroupName: groupName,
    subscriptionId: subId ?? subscriptionId,
  };
};
