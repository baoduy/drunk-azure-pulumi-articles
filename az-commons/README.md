Sure! Here is a `README.md` for your project:

# az-commons

`az-commons` is a utility library for managing Azure resources using Pulumi. It provides functions to retrieve and format resource names, as well as to access Azure environment configurations.

## Installation

To install the dependencies, run:

```bash
pnpm install
```

````

## Building the Project

To build the project, run:

```bash
pnpm run build
```

## Usage

### Exported Modules

The project exports several modules that can be used to interact with Azure resources and configurations.

#### `azEnv`

This module provides functions to retrieve Azure environment configurations.

- **tenantId**: The tenant ID from the Azure client configuration.
- **subscriptionId**: The subscription ID from the Azure client configuration.
- **currentPrincipal**: The object ID of the current principal (user or service principal).
- **currentRegionCode**: The current Azure region code, defaulting to "SoutheastAsia" if not set.

#### `naming`

This module provides functions to generate resource names with a stack name as a prefix.

- **getGroupName(name: string)**: Retrieves the resource group name with the stack name as a prefix.
- **getName(name: string, suffix?: string)**: Retrieves the resource name with the stack name as a prefix and optionally appends a suffix.

#### `stackEnv`

This module provides functions to retrieve Pulumi stack environment configurations.

- **isDryRun**: Indicates if the current run is a dry run.
- **organization**: The Pulumi organization.
- **projectName**: The Pulumi project name.
- **stack**: The Pulumi stack name.

## License

This project is licensed under the MIT License.
````
