export const azGroups = {
  //The name of Shared resource group
  shared: "01-shared",
  //The name of Hub VNet resource group
  hub: "02-hub",
  //The name of AKS VNet resource group
  aks: "03-aks",
  //The name of CloudPC VNet resource group
  cloudPC: "04-cloudPC",
};

//The subnet IP address spaces
export const subnetSpaces = {
  firewall: "192.168.30.0/26",
  firewallManage: "192.168.30.64/26",
  general: "192.168.30.128/27",
  aks: "192.168.31.0/24",
  cloudPC: "192.168.32.0/25",
  devOps: "192.168.32.128/27",
};

//Define the output type for reusable
export type SharedStackOutput = {
  rsGroupId: string;
  logWorkspace: { id: string; customerId: string };
  appInsight: { id: string; key: string };
  vault: { id: string; readOnlyGroupId: string; writeGroupId: string };
};

export type HubVnetOutput = {
  rsGroupId: string;
  hubVnetId: string;
  ipAddress: { address: string; id: string };
  firewall: { address: string; id: string };
};
