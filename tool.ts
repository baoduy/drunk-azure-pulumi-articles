import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { platform } from 'os';
import { join, resolve } from 'path';

// get library path
const lib = resolve(__dirname, './');

async function spawnAsync(
    command: string,
    args: string[],
    options?: SpawnOptionsWithoutStdio
) {
    const child = spawn(command, args, options);

    const exitCode = await new Promise((resolve, reject) => {
        child.on('close', resolve);
    });

    if (exitCode) {
        throw new Error(`subprocess error exit ${exitCode}`);
    }
}

async function main() {
    const action = process.argv[process.argv.length - 1];
    for (const mod of readdirSync(lib)) {
        const modPath = join(lib, mod);
        // ensure path has package.json
        if (!existsSync(join(modPath, 'package.json'))) return;

        const options = {
            env: process.env,
            cwd: modPath,
            stdio: 'inherit' as any,
            //timeout: 1000,
        };

        console.log(`Processing Folder to '${action}' for`, modPath);

        // install folder
        if (action === 'build')
            await spawnAsync('pnpm', ['run', 'build'], options);
        else if (action === 'update')
            await spawnAsync('pnpm', ['run', 'update'], options);
        else await spawnAsync('pnpm', ['install', '--force'], options);
    }
}

main().then();
