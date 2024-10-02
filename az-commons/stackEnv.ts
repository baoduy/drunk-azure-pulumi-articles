import * as pulumi from '@pulumi/pulumi';

export const isDryRun = Boolean(process.env.PULUMI_NODEJS_DRY_RUN);
export const organization = process.env.PULUMI_NODEJS_ORGANIZATION!;
export const projectName =
    process.env.PULUMI_NODEJS_PROJECT ?? pulumi.getProject().toLowerCase();
export const stack =
    process.env.PULUMI_NODEJS_STACK ?? pulumi.getStack().toLowerCase();

/**Get stack reference for a project*/
export const StackReference = <TOutput>(
    projectName: string
): pulumi.Output<TOutput> => {
    const stackRef = new pulumi.StackReference(
        `${organization}/${projectName}/${stack}`
    );
    return stackRef.outputs.apply(
        (s) => s.default ?? s
    ) as pulumi.Output<TOutput>;
};

console.log('Pulumi Environments:', {
    organization,
    projectName,
    stack,
    isDryRun,
});

/**Get stack reference for current project*/
export const CurrentProjectReference = <TOutput>() =>
    StackReference<TOutput>(projectName);
