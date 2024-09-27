# Day0 Pulumi Azure Start

This project is a minimal Azure Native TypeScript Pulumi program that sets up an Azure Resource Group and a Storage Account. The primary key of the Storage Account is exported for further use.

## Prerequisites

- [Node.js](https://nodejs.org/) (v14 or later)
- [Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [PNPM](https://pnpm.io/installation) (as the package manager)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) (for managing Azure resources)

## Project Structure

- `index.ts`: Main TypeScript file where the Pulumi resources are defined.
- `package.json`: Contains project metadata and dependencies.
- `tsconfig.json`: TypeScript configuration file.
- `Pulumi.yaml`: Pulumi project configuration file.
- `Pulumi.dev.yaml`: Pulumi configuration file for the development environment.

## Setup

1. **Install Dependencies**

   Run the following command to install the necessary dependencies:

   ```sh
   pnpm install
   ```

2. **Configure Pulumi**

   Ensure you have logged into Pulumi and configured your Azure credentials. You can follow the [Pulumi Azure setup guide](https://www.pulumi.com/docs/intro/cloud-providers/azure/setup/) for detailed instructions.

3. **Set Configuration**

   The location for the Azure resources is set in `Pulumi.dev.yaml`. You can run the below command:

   ```bash
   # Set the default Pulumi organization (replace with your organization name)
   pulumi org set-default YOUR_PULUMI_ORGANIZATION

   # Configure Azure settings
   pulumi config set azure-native:tenantId YOUR_AZURE_TENANT_ID
   pulumi config set azure-native:subscriptionId YOUR_AZURE_SUBSCRIPTION_ID
   pulumi config set azure-native:location YOUR_AZURE_LOCATION  # e.g., EastUS

   # Optional: If you're using a service principal for authentication
   pulumi config set azure-native:clientId YOUR_AZURE_CLIENT_ID
   pulumi config set azure-native:clientSecret YOUR_AZURE_CLIENT_SECRET --secret
   ```

## Usage

### Deploy the Stack

To deploy the stack, run:

```sh
pnpm run up
```

This will create the Azure Resource Group and Storage Account as defined in `index.ts`.

### Destroy the Stack

To destroy the stack and delete all resources, run:

```sh
pnpm run destroy
```

## License

This project is licensed under the MIT License.
