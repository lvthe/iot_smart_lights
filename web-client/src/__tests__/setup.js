import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Mock the real 'paho-mqtt' package (MQTTContext does `import * as Paho from 'paho-mqtt'`).
// Without this, tests instantiate a real Paho.Client and attempt a real network/WebSocket
// connection to the broker, which crashes the test process asynchronously.
vi.mock('paho-mqtt', () => {
  class MockClient {
    constructor() {
      this.connect = vi.fn();
      this.disconnect = vi.fn();
      this.subscribe = vi.fn();
      this.publish = vi.fn();
      this.unsubscribe = vi.fn();
      this.onConnectionLost = null;
      this.onMessageArrived = null;
    }
  }

  return {
    Client: MockClient,
    Message: vi.fn(),
  };
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
