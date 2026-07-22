import { describe, test, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMQTT, MQTTProvider } from '@/context/MQTTContext';
import { DEVICES } from '@/utils/data.js';
import { DEFAULT_BRIGHTNESS, DEFAULT_COLOR_ID } from '@/utils/constants.js';
import { getColorById } from '@/utils/helpers.js';

describe('MQTT Context', () => {
  describe('Initial State', () => {
    test('should provide initial states', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      // connectMQTT() is deferred via setTimeout(0), so right after mount the
      // status is still the synchronous initial value ('disconnected').
      expect(result.current.isConnected).toBe(false);
      expect(result.current.brokerStatus).toBe('disconnected');
      expect(result.current.deviceStates).toBeDefined();
      expect(result.current.onlineDevices).toBeDefined();
      expect(result.current.logs).toBeDefined();
    });

    test('should provide all required context values', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('brokerStatus');
      expect(result.current).toHaveProperty('deviceStates');
      expect(result.current).toHaveProperty('onlineDevices');
      expect(result.current).toHaveProperty('logs');
      expect(result.current).toHaveProperty('pendingStates');
      expect(result.current).toHaveProperty('publishControl');
      expect(result.current).toHaveProperty('addLog');
      expect(result.current).toHaveProperty('updateDeviceState');
      expect(result.current).toHaveProperty('clearLogs');
    });
  });

  describe('Device States', () => {
    test('should have initial device states for all devices', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      const deviceKeys = Object.keys(DEVICES);
      deviceKeys.forEach(key => {
        expect(result.current.deviceStates[key]).toBeDefined();
        expect(result.current.deviceStates[key]).toHaveProperty('on');
        expect(result.current.deviceStates[key]).toHaveProperty('brightness');
        expect(result.current.deviceStates[key]).toHaveProperty('color');
      });
    });

    test('should have default device state values', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      const defaultColor = getColorById(DEFAULT_COLOR_ID);
      Object.values(result.current.deviceStates).forEach(state => {
        expect(state.on).toBe(false);
        expect(state.brightness).toBe(DEFAULT_BRIGHTNESS);
        expect(state.color).toEqual(defaultColor);
      });
    });
  });

  describe('updateDeviceState', () => {
    test('should update device state', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      act(() => {
        result.current.updateDeviceState('livingCeiling', { on: true });
      });

      expect(result.current.deviceStates.livingCeiling.on).toBe(true);
    });

    test('should update brightness', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      act(() => {
        result.current.updateDeviceState('livingCeiling', { brightness: 50 });
      });

      expect(result.current.deviceStates.livingCeiling.brightness).toBe(50);
    });

    test('should update color', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      const newColor = { r: 255, g: 0, b: 0 };
      act(() => {
        result.current.updateDeviceState('livingCeiling', { color: newColor });
      });

      expect(result.current.deviceStates.livingCeiling.color).toEqual(newColor);
    });

    test('should update multiple properties at once', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      act(() => {
        result.current.updateDeviceState('livingCeiling', {
          on: true,
          brightness: 80,
          color: { r: 100, g: 150, b: 200 }
        });
      });

      const state = result.current.deviceStates.livingCeiling;
      expect(state.on).toBe(true);
      expect(state.brightness).toBe(80);
      expect(state.color).toEqual({ r: 100, g: 150, b: 200 });
    });
  });

  describe('addLog', () => {
    test('should add a log entry', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      act(() => {
        result.current.addLog('control', 'smartlights/living/ceiling/control', '{"state":"ON"}');
      });

      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].type).toBe('control');
      expect(result.current.logs[0].topic).toBe('smartlights/living/ceiling/control');
      expect(result.current.logs[0].message).toBe('{"state":"ON"}');
    });

    test('should add log with correct structure', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      act(() => {
        result.current.addLog('status', 'test/topic', 'test message');
      });

      const log = result.current.logs[0];
      expect(log).toHaveProperty('id');
      expect(log).toHaveProperty('time');
      expect(log).toHaveProperty('type');
      expect(log).toHaveProperty('topic');
      expect(log).toHaveProperty('message');
    });

    test('should keep only last 100 logs', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      // Add 250 logs
      act(() => {
        for (let i = 0; i < 250; i++) {
          result.current.addLog('test', `topic-${i}`, `message-${i}`);
        }
      });

      expect(result.current.logs).toHaveLength(100);
    });
  });

  describe('clearLogs', () => {
    test('should clear all logs and add system log', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      // Add some logs
      act(() => {
        result.current.addLog('control', 'test/topic', 'test message');
        result.current.addLog('status', 'test/topic2', 'test message2');
      });

      expect(result.current.logs).toHaveLength(2);

      // Clear logs
      act(() => {
        result.current.clearLogs();
      });

      // clearLogs adds a system log after clearing
      expect(result.current.logs).toHaveLength(1);
      expect(result.current.logs[0].type).toBe('system');
      expect(result.current.logs[0].message).toBe('Logs đã được xóa');
    });
  });

  describe('Online Devices', () => {
    test('should track online devices', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      // Initially no devices online
      expect(result.current.onlineDevices.size).toBe(0);
    });

    test('should have onlineDevices as Set', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      // onlineDevices should be a Set with has, add, delete methods
      expect(result.current.onlineDevices).toBeInstanceOf(Set);
      expect(typeof result.current.onlineDevices.has).toBe('function');
    });
  });

  describe('Error Handling', () => {
    test('should throw error when useMQTT is used without provider', () => {
      // Suppress the expected error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useMQTT());
      }).toThrow('useMQTT must be used within MQTTProvider');

      console.error = originalError;
    });
  });

  describe('Context Availability', () => {
    test('should provide functions that can be called', () => {
      const { result } = renderHook(() => useMQTT(), {
        wrapper: MQTTProvider
      });

      expect(typeof result.current.publishControl).toBe('function');
      expect(typeof result.current.addLog).toBe('function');
      expect(typeof result.current.updateDeviceState).toBe('function');
      expect(typeof result.current.clearLogs).toBe('function');
    });
  });
});
