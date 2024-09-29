import * as forge from "node-forge";
import * as pulumi from "@pulumi/pulumi";
import { generateKeyPair, RSAKeyPairOptions } from "crypto";

const generateKeys = (options: RSAKeyPairOptions<"pem", "pem">) =>
  new Promise<{ publicKey: string; privateKey: string }>((resolve, reject) => {
    generateKeyPair(
      "rsa",
      options,
      (err: Error | null, pK: string, prK: string) => {
        if (err) reject(err);

        const publicKey = forge.ssh.publicKeyToOpenSSH(
          forge.pki.publicKeyFromPem(pK),
        );
        const privateKey = forge.ssh.privateKeyToOpenSSH(
          forge.pki.decryptRsaPrivateKey(
            prK,
            options.privateKeyEncoding.passphrase,
          ),
        );

        resolve({ publicKey, privateKey });
      },
    );
  });

/**
 * By default Pulumi is not support Ssh generator.
 * This class was implemented using a amazing feature of pulumi called `Dynamic Provider`.
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

class SshResourceProvider implements pulumi.dynamic.ResourceProvider {
  constructor(private name: string) {}

  async create(
    inputs: SshKeyInputs,
  ): Promise<pulumi.dynamic.CreateResult<SshKeyOutputs>> {
    const { publicKey, privateKey } = await generateKeys({
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
        cipher: "aes-256-cbc",
        passphrase: inputs.password,
      },
    });

    return {
      id: this.name,
      outs: {
        ...inputs,
        publicKey,
        privateKey,
      },
    };
  }
}

export class SshGenerator extends pulumi.dynamic.Resource {
  declare readonly name: string;
  declare readonly publicKey: pulumi.Output<string>;
  declare readonly privateKey: pulumi.Output<string>;
  declare readonly password: pulumi.Output<string>;

  constructor(
    name: string,
    args: DeepInput<SshKeyInputs>,
    opts?: pulumi.CustomResourceOptions,
  ) {
    const innerOpts = pulumi.mergeOptions(opts, {
      additionalSecretOutputs: ["publicKey", "privateKey", "password"],
    });
    const innerInputs = {
      publicKey: undefined,
      privateKey: undefined,
      password: pulumi.secret(args.password),
    };

    super(
      new SshResourceProvider(name),
      `csp:SshGenerator:${name}`,
      innerInputs,
      innerOpts,
    );
  }
}

export default SshGenerator;
