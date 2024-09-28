export const azGroups = {
  //The name of Shared resource group
  shared: "01-shared",
  //The name of Hub VNet resource group
  hub: "02-hub",
  //The name of AKS VNet resource group
  ask: "03-ask",
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
