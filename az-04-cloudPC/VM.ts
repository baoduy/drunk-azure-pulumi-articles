import { getName } from '@az-commons';
import * as azure from '@pulumi/azure-native';
import * as pulumi from '@pulumi/pulumi';
import * as random from '@pulumi/random';

/**
 * Generate the username and password for the vm
 * */
const generateLogin = (
    name: string,
    vaultInfo: {
        resourceGroupName: pulumi.Input<string>;
        vaultName: pulumi.Input<string>;
    }
) => {
    const usernameKey = getName(name, 'username');
    const username = new random.RandomString(usernameKey, {
        length: 15,
        special: false,
    });
    const passwordKey = getName(name, 'password');
    const password = new random.RandomPassword(passwordKey, {
        length: 50,
    });

    //Store secrets to the vault
    [
        { name: usernameKey, value: username.result },
        { name: passwordKey, value: password.result },
    ].map(
        (item) =>
            new azure.keyvault.Secret(
                item.name,
                {
                    ...vaultInfo,
                    secretName: item.name,
                    properties: { value: item.value },
                },
                { dependsOn: [username, password] }
            )
    );

    return { username, password };
};

/**
 * THis Vm will be a linux VM
 * - `username` and `password` will be generated using pulumi random and store in Key Vault.
 * - The AzureDevOps extension will be installed automatically and become a private AzureDevOps agent.
 * - It will be encrypted with a custom key from Key Vault also.
 * - The disk also will be encrypted with a DiskEncryptionSet.
 * */
export default (
    name: string,
    {
        vaultInfo,
    }: {
        rsGroup: azure.resources.ResourceGroup;
        vaultInfo: {
            resourceGroupName: pulumi.Input<string>;
            vaultName: pulumi.Input<string>;
        };
    }
) => {
    const loginInfo = generateLogin(name, vaultInfo);
};
