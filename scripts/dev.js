const { spawn } = require('node:child_process');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'cmd.exe' : 'npm';

const npmArgs = (...args) => {
  if (!isWindows) return args;

  return ['/d', '/s', '/c', ['npm', ...args].join(' ')];
};

const commands = [
  {
    name: 'backend',
    args: npmArgs('--prefix', 'backend', 'run', 'dev'),
  },
  {
    name: 'frontend',
    args: npmArgs('run', 'dev:frontend'),
  },
];

const children = commands.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    env: process.env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const write = (stream, data) => {
    String(data)
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => stream.write(`[${name}] ${line}\n`));
  };

  child.stdout.on('data', (data) => write(process.stdout, data));
  child.stderr.on('data', (data) => write(process.stderr, data));

  return { name, child };
});

let shuttingDown = false;

const stopAll = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;

  children.forEach(({ child }) => {
    if (!child.killed) child.kill();
  });

  setTimeout(() => process.exit(exitCode), 300);
};

children.forEach(({ name, child }) => {
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;

    console.log(`[${name}] stopped (${signal || code})`);
    stopAll(code || 1);
  });
});

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
