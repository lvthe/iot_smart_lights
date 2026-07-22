import { describe, test, expect } from 'vitest';
import MQTT_CONFIG from '@/configs/mqtt.config.js';
import { DEVICE_RESPONSE_TIMEOUT, CONTROL_RESPONSE_TIMEOUT, INTERVAL_DEVICE_TIMEOUT_CHECK } from '@/utils/constants.js';

// NOTE: MQTT_CONFIG values come from VITE_MQTT_* env vars (see web-client/.env,
// gitignored, machine-specific). These tests intentionally check structure/types
// rather than hardcoded broker/port values, since those aren't stable across setups.

describe('MQTT Configuration', () => {
  describe('Configuration Structure', () => {
    test('MQTT_CONFIG should have all required properties', () => {
      expect(MQTT_CONFIG).toHaveProperty('broker');
      expect(MQTT_CONFIG).toHaveProperty('port');
      expect(MQTT_CONFIG).toHaveProperty('username');
      expect(MQTT_CONFIG).toHaveProperty('password');
      expect(MQTT_CONFIG).toHaveProperty('clientId');
    });

    test('broker and port should be defined when env vars are set', () => {
      // Skips value assertions if .env isn't configured on this machine
      if (MQTT_CONFIG.broker) {
        expect(typeof MQTT_CONFIG.broker).toBe('string');
      }
      if (!Number.isNaN(MQTT_CONFIG.port)) {
        expect(typeof MQTT_CONFIG.port).toBe('number');
      }
    });
  });

  describe('Timeout Constants', () => {
    test('should have correct device response timeout (40s)', () => {
      expect(DEVICE_RESPONSE_TIMEOUT).toBe(40000);
      expect(typeof DEVICE_RESPONSE_TIMEOUT).toBe('number');
    });

    test('should have correct control response timeout (5s)', () => {
      expect(CONTROL_RESPONSE_TIMEOUT).toBe(5000);
      expect(typeof CONTROL_RESPONSE_TIMEOUT).toBe('number');
    });

    test('should have device timeout check interval (5s)', () => {
      expect(INTERVAL_DEVICE_TIMEOUT_CHECK).toBe(5000);
      expect(typeof INTERVAL_DEVICE_TIMEOUT_CHECK).toBe('number');
    });

    test('control response timeout should be less than device timeout', () => {
      expect(CONTROL_RESPONSE_TIMEOUT).toBeLessThan(DEVICE_RESPONSE_TIMEOUT);
    });

    test('check interval should be reasonable', () => {
      expect(INTERVAL_DEVICE_TIMEOUT_CHECK).toBeGreaterThan(0);
      expect(INTERVAL_DEVICE_TIMEOUT_CHECK).toBeLessThanOrEqual(10000);
    });
  });

  describe('Port Validity (when configured)', () => {
    test('port should be in valid range if set', () => {
      if (!Number.isNaN(MQTT_CONFIG.port)) {
        expect(MQTT_CONFIG.port).toBeGreaterThan(0);
        expect(MQTT_CONFIG.port).toBeLessThanOrEqual(65535);
      }
    });
  });
});
