import * as resources from "@pulumi/azure-native/resources";
import * as network from "@pulumi/azure-native/network";
import * as inputs from "@pulumi/azure-native/types/input";
import { getName } from "@az-commons";

export default (
  name: string,
  {
    rsGroup,
    subnets,
  }: {
    rsGroup: resources.ResourceGroup;
    subnets: inputs.network.SubnetArgs[];
  },
) =>
  new network.VirtualNetwork(
    getName(name, "vnet"),
    {
      // Resource group name
      resourceGroupName: rsGroup.name,
      //Enable VN protection
      enableVmProtection: true,
      //Enable Vnet encryption
      encryption: {
        enabled: true,
        enforcement:
          network.VirtualNetworkEncryptionEnforcement.AllowUnencrypted,
      },
      addressSpace: {
        addressPrefixes: subnets.map((s) => s.addressPrefix!),
      },
      subnets,
    },
    // Ensure the virtual network depends on the resource group
    { dependsOn: rsGroup },
  );
