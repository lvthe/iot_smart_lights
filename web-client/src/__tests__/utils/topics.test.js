import { describe, test, expect } from 'vitest';
import { TOPICS } from '@/utils/topics.js';
import { ROOMS, DEVICES } from '@/utils/data.js';
import { getDevicesByRoom, isRGBDevice } from '@/utils/helpers.js';

describe('MQTT Topics Utils', () => {
  describe('TOPICS Structure', () => {
    test('should have control topic defined', () => {
      expect(TOPICS.control).toBeDefined();
      expect(TOPICS.control).toBe('esp32/control');
    });

    test('should have status topic defined', () => {
      expect(TOPICS.status).toBeDefined();
      expect(TOPICS.status).toBe('esp32/status');
    });
  });

  describe('ROOMS Configuration', () => {
    test('should have all rooms defined with correct structure', () => {
      Object.values(ROOMS).forEach(room => {
        expect(room).toHaveProperty('id');
        expect(room).toHaveProperty('name');
        expect(room).toHaveProperty('icon');
      });
    });

    test('should have correct living room configuration', () => {
      expect(ROOMS.living.id).toBe('living');
      expect(ROOMS.living.name).toBe('Phòng khách');
      expect(ROOMS.living.icon).toBe('🛋️');
    });

    test('should have correct bedroom configuration', () => {
      expect(ROOMS.bedroom.id).toBe('bedroom');
      expect(ROOMS.bedroom.name).toBe('Phòng ngủ');
      expect(ROOMS.bedroom.icon).toBe('🛏️');
    });

    test('should have correct kitchen configuration', () => {
      expect(ROOMS.kitchen.id).toBe('kitchen');
      expect(ROOMS.kitchen.name).toBe('Nhà bếp');
      expect(ROOMS.kitchen.icon).toBe('🍳');
    });

    test('should have correct bathroom configuration', () => {
      expect(ROOMS.bathroom.id).toBe('bathroom');
      expect(ROOMS.bathroom.name).toBe('Phòng tắm');
      expect(ROOMS.bathroom.icon).toBe('🚿');
    });

    test('should have exactly 4 rooms', () => {
      expect(Object.keys(ROOMS)).toHaveLength(4);
    });
  });

  describe('DEVICES Configuration', () => {
    test('should have all devices defined with correct structure', () => {
      Object.values(DEVICES).forEach(device => {
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('name');
        expect(device).toHaveProperty('type');
        expect(device).toHaveProperty('field_thingspeak');
        expect(device).toHaveProperty('room_key');
      });
    });

    test('should have all 6 devices', () => {
      expect(Object.keys(DEVICES)).toHaveLength(6);
    });

    test('device IDs should match their keys', () => {
      Object.keys(DEVICES).forEach(key => {
        expect(DEVICES[key].id).toBe(key);
      });
    });

    test('all device room_keys should be valid', () => {
      const validRooms = new Set(Object.keys(ROOMS));
      Object.values(DEVICES).forEach(device => {
        expect(validRooms).toContain(device.room_key);
      });
    });

    test('living room devices should match room configuration', () => {
      const livingDevices = Object.values(DEVICES)
        .filter(d => d.room_key === 'living')
        .map(d => d.id);
      expect(livingDevices).toEqual(expect.arrayContaining(['living_main', 'living_tv']));
      expect(livingDevices).toHaveLength(2);
    });

    test('bedroom devices should match room configuration', () => {
      const bedroomDevices = Object.values(DEVICES)
        .filter(d => d.room_key === 'bedroom')
        .map(d => d.id);
      expect(bedroomDevices).toEqual(expect.arrayContaining(['bedroom_headboard', 'bedroom_desk']));
      expect(bedroomDevices).toHaveLength(2);
    });

    test('kitchen devices should match room configuration', () => {
      const kitchenDevices = Object.values(DEVICES)
        .filter(d => d.room_key === 'kitchen')
        .map(d => d.id);
      expect(kitchenDevices).toEqual(['kitchen']);
    });

    test('bathroom devices should match room configuration', () => {
      const bathroomDevices = Object.values(DEVICES)
        .filter(d => d.room_key === 'bathroom')
        .map(d => d.id);
      expect(bathroomDevices).toEqual(['bathroom']);
    });
  });

  describe('getDevicesByRoom Helper', () => {
    test('should return correct devices for living room', () => {
      const devices = getDevicesByRoom('living');
      expect(devices).toEqual(['living_main', 'living_tv']);
      expect(devices).toHaveLength(2);
    });

    test('should return correct devices for bedroom', () => {
      const devices = getDevicesByRoom('bedroom');
      expect(devices).toEqual(['bedroom_headboard', 'bedroom_desk']);
      expect(devices).toHaveLength(2);
    });

    test('should return correct devices for kitchen', () => {
      const devices = getDevicesByRoom('kitchen');
      expect(devices).toEqual(['kitchen']);
      expect(devices).toHaveLength(1);
    });

    test('should return correct devices for bathroom', () => {
      const devices = getDevicesByRoom('bathroom');
      expect(devices).toEqual(['bathroom']);
      expect(devices).toHaveLength(1);
    });

    test('should return empty array for invalid room', () => {
      const devices = getDevicesByRoom('invalid_room');
      expect(devices).toEqual([]);
    });
  });

  describe('isRGBDevice Helper', () => {
    test('should identify RGB devices correctly', () => {
      expect(isRGBDevice('living_main')).toBe(true);
      expect(isRGBDevice('living_tv')).toBe(true);
      expect(isRGBDevice('bedroom_headboard')).toBe(true);
      expect(isRGBDevice('bedroom_desk')).toBe(true);
      expect(isRGBDevice('kitchen')).toBe(true);
    });

    test('should identify non-RGB devices', () => {
      expect(isRGBDevice('bathroom')).toBe(false);
    });

    test('should return false for invalid device', () => {
      expect(isRGBDevice('invalid_device')).toBe(false);
    });
  });
});
