/**
 * Node test environment for the webhook delivery tests. They need a real
 * `fetch`, `http` server and WebCrypto, which jsdom lacks. `jest.setup.js`
 * touches `HTMLCanvasElement` unconditionally, so a stub is provided here.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TestEnvironment } = require('jest-environment-node');

class WebhookNodeEnvironment extends TestEnvironment {
  async setup() {
    await super.setup();
    this.global.HTMLCanvasElement = class HTMLCanvasElement {};
  }
}

module.exports = WebhookNodeEnvironment;
