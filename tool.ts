import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { existsSync, promises } from 'node:fs';
import { join, resolve } from 'path';

// get library path
const lib = resolve(__dirname, './');

async function spawnAsync(
    command: string,
    args: string[],
    options?: SpawnOptionsWithoutStdio
) {
    const child = spawn(command, args, options);

    const exitCode = await new Promise((resolve) => {
        child.on('close', resolve);
    });

    if (exitCode) {
        throw new Error(`subprocess error exit ${exitCode}`);
    }
}

async function main() {
    const action = process.argv[process.argv.length - 1];
    const folders = (await promises.readdir(lib))
        .map((f) => {
            const modPath = join(lib, f);
            if (existsSync(join(modPath, 'package.json'))) return f;
            return undefined;
        })
        .filter((f) => f !== undefined);

    for (const f of folders) {
        const modPath = join(lib, f!);
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
        else await spawnAsync('pnpm', ['install'], options);
    }
}

main().then();
