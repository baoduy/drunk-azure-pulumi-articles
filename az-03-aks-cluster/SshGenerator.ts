import { generateKeyPair, RSAKeyPairOptions } from 'crypto';
import * as pulumi from '@pulumi/pulumi';
import * as forge from 'node-forge';

/** A core method to generate the Ssh keys using node-force */
const generateKeys = (options: RSAKeyPairOptions<'pem', 'pem'>) =>
    new Promise<{ publicKey: string; privateKey: string }>(
        (resolve, reject) => {
            generateKeyPair(
                'rsa',
                options,
                (err: Error | null, pK: string, prK: string) => {
                    if (err) reject(err);

                    const publicKey = forge.ssh.publicKeyToOpenSSH(
                        forge.pki.publicKeyFromPem(pK)
                    );
                    const privateKey = forge.ssh.privateKeyToOpenSSH(
                        forge.pki.decryptRsaPrivateKey(
                            prK,
                            options.privateKeyEncoding.passphrase
                        )
                    );

                    resolve({ publicKey, privateKey });
                }
            );
        }
    );

/**
 * There is no native Pulumi component to Ssh generator.
 * This class was implemented using an amazing feature of pulumi called `Dynamic Resource Provider`.
 * Refer here for detail: https://www.pulumi.com/docs/iac/concepts/resources/dynamic-providers/
 * */
export type DeepInput<T> = T extends object
    ? { [K in keyof T]: DeepInput<T[K]> | pulumi.Input<T[K]> }
    : pulumi.Input<T>;

interface SshKeyInputs {
    password: string;
}

interface SshKeyOutputs {
    password: string;
    privateKey: string;
    publicKey: string;
}

/** Ssh Resource Provider*/
class SshResourceProvider implements pulumi.dynamic.ResourceProvider {
    constructor(private name: string) {}

    /**Method will be executed when pulumi resource creating.
     * In here we just generate ssh with provided password and return the results as output of component*/
    async create(
        inputs: SshKeyInputs
    ): Promise<pulumi.dynamic.CreateResult<SshKeyOutputs>> {
        const { publicKey, privateKey } = await generateKeys({
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
                cipher: 'aes-256-cbc',
                passphrase: inputs.password,
            },
        });

        return {
            id: this.name,
            outs: {
                password: inputs.password,
                publicKey,
                privateKey,
            },
        };
    }

    /** The method will be executed when pulumi resource is updating.
     * We do nothing here but just return the output that was created before*/
    async update(
        id: string,
        old: SshKeyOutputs,
        news: SshKeyInputs
    ): Promise<pulumi.dynamic.UpdateResult<SshKeyOutputs>> {
        //no update needed
        return { outs: old };
    }
}

/** The Ssh Generator Resource will use the provider above to generate and store the output into the pulumi project state. */
export class SshGenerator extends pulumi.dynamic.Resource {
    declare readonly name: string;
    declare readonly publicKey: pulumi.Output<string>;
    declare readonly privateKey: pulumi.Output<string>;
    declare readonly password: pulumi.Output<string>;

    constructor(
        name: string,
        args: DeepInput<SshKeyInputs>,
        opts?: pulumi.CustomResourceOptions
    ) {
        const innerOpts = pulumi.mergeOptions(opts, {
            //This is important to tell pulumi to encrypt these outputs in the state. The encrypting and decrypting will be handled bt pulumi automatically
            additionalSecretOutputs: ['publicKey', 'privateKey', 'password'],
        });

        const innerInputs = {
            publicKey: undefined,
            privateKey: undefined,
            //This to tell pulumi that this input is a secret, and it will be encrypted in the state as well.
            password: pulumi.secret(args.password),
        };

        super(
            new SshResourceProvider(name),
            `csp:SshGenerator:${name}`,
            innerInputs,
            innerOpts
        );
    }
}

//Export the SshGenerator resource as default of the module
export default SshGenerator;
