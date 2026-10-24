const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const { createVnpaySandboxRelay, sandboxRelayConfig } = require('../src/services/vnpaySandboxRelay');

const port = Number(process.env.VNPAY_TEST_RELAY_PORT || 5002);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid Sandbox relay port');
const server = createVnpaySandboxRelay(sandboxRelayConfig());
server.listen(port, '127.0.0.1', () => {
    console.log(`VNPAY Sandbox return: http://127.0.0.1:${port}/vnpay-return`);
    console.log('Only signed VNPAY Sandbox responses are forwarded to the local backend.');
});
server.on('error', () => { console.error('Unable to start the local VNPAY Sandbox return relay. Check its port.'); process.exitCode = 1; });
