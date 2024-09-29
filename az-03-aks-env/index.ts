import * as resources from "@pulumi/azure-native/resources";
import * as pulumi from "@pulumi/pulumi";
import { getGroupName, StackReference } from "@az-commons";
import * as config from "../config";
import VNet from "./VNet";

//Reference to the output of `az-01-shared` and link workspace to firewall for log monitoring.
const sharedStack = StackReference("az-01-shared") as pulumi.Output<{
  logWorkspace: { id: string };
}>;

// Create Vnet
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.hub));

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.hub, {
  rsGroup,
  subnets: [
    {
      name: "aks",
      addressPrefix: config.subnetSpaces.aks,
    },
  ],
});

// Export the information that will be used in the other projects
