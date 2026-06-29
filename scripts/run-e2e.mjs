import { spawn } from 'node:child_process';

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: true, ...options });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });

// spawn uses shell:true so Windows resolves the npm/npx .cmd shims (Node >=20
// throws EINVAL on .cmd with shell:false; a bare name is ENOENT otherwise).
const npmCommand = 'npm';
const npxCommand = 'npx';

await run(npmCommand, ['run', 'typecheck:e2e']);

const env = {
  ...process.env,
  BASE_PATH: '/',
  NEXT_PUBLIC_BASE_PATH: '/'
};

process.env.BASE_PATH = '/';
process.env.NEXT_PUBLIC_BASE_PATH = '/';

await run(npxCommand, ['playwright', 'test', '--reporter=line'], { env });
