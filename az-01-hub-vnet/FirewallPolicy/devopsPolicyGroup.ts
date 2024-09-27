import { subnetSpaces } from "../../config";
import * as pulumi from "@pulumi/pulumi";
import * as inputs from "@pulumi/azure-native/types/input";

const netRules: pulumi.Input<inputs.network.NetworkRuleArgs>[] = [
  {
    ruleType: "NetworkRule",
    name: "devops-to-aks",
    description: "Allows devops to access aks for deployment purposes.",
    ipProtocols: ["TCP"],
    sourceAddresses: [subnetSpaces.devOps],
    destinationAddresses: ["*"],
    destinationPorts: ["443"],
  },
];

const appRules: pulumi.Input<inputs.network.ApplicationRuleArgs>[] = [];

export default { appRules, netRules };
