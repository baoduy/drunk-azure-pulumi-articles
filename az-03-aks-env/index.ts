import * as resources from "@pulumi/azure-native/resources";
import * as pulumi from "@pulumi/pulumi";
import { getGroupName, getName, StackReference } from "@az-commons";
import * as config from "../config";
import VNet from "./VNet";
import Aks from "./Aks";

//Reference to the output of `az-01-shared` and link workspace to firewall for log monitoring.
const sharedStack = StackReference(
  "az-01-shared",
) as pulumi.Output<config.SharedStackOutput>;
const hubVnetStack = StackReference(
  "az-02-hub-vnet",
) as pulumi.Output<config.HubVnetOutput>;

// Create Vnet
const rsGroup = new resources.ResourceGroup(getGroupName(config.azGroups.aks));

// Create Virtual Network with Subnets
const vnet = VNet(config.azGroups.aks, {
  rsGroup,
  subnets: [
    {
      name: "aks",
      addressPrefix: config.subnetSpaces.aks,
    },
  ],
  //allows vnet to firewall's private IP
  securityRules: [
    {
      name: `allows-vnet-to-hub-firewall`,
      description: "Allows Vnet to hub firewall Outbound",
      priority: 300,
      protocol: "*",
      access: "Allow",
      direction: "Outbound",
      sourceAddressPrefix: hubVnetStack.firewall.address.apply(
        (ip) => `${ip}/32`,
      ),
      sourcePortRange: "*",
      destinationAddressPrefix: "VirtualNetwork",
      destinationPortRange: "*",
    },
  ],
  //route all requests to firewall's private IP
  routes: [
    {
      name: "route-vnet-to-firewall",
      addressPrefix: "0.0.0.0/0",
      nextHopIpAddress: hubVnetStack.firewall.address,
      nextHopType: "VirtualAppliance",
    },
  ],
  //peering to hub vnet
  peeringVnetId: hubVnetStack.hubVnetId,
});

const aks = Aks(config.azGroups.aks, {
  rsGroup,
  nodeAdminUserName: getName(config.azGroups.aks, "admin"),
  vnet,
});

// Export the information that will be used in the other projects
export const rsGroupId = rsGroup.id;
export const aksVnetId = vnet.id;
export const aksId = aks.id;
