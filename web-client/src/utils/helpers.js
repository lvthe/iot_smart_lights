/**
 * Helper Functions
 * Các hàm tiện ích cho color và device
 */

import { COLOR_ARRAY, DEFAULT_COLOR_ID } from './constants.js';
import { DEVICES } from './data.js';

// ===== Color Helpers =====

/**
 * Lấy color object theo ID từ mảng COLOR_ARRAY
 * @param {string} id - Color ID từ COLOR_ID constants
 * @returns {Object} Color object với các thuộc tính: id, name, hex, r, g, b
 * @throws {Error} Nếu ID không được cung cấp hoặc không tìm thấy
 */
export const getColorById = (id) => {
  if (!id) {
    return getColorById(DEFAULT_COLOR_ID);
  }
  const color = COLOR_ARRAY.find(c => c.id === id);
  if (!color) {
    console.warn(`getColorById: Color with id "${id}" not found, using default`);
    return getColorById(DEFAULT_COLOR_ID);
  }
  return color;
};

/**
 * Tìm color preset từ RGB values (khi nhận từ ESP32 status)
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {Object} Color object từ COLOR_ARRAY
 */
export const findColorByRGB = (r, g, b) => {
  return COLOR_ARRAY.find(c => c.r === r && c.g === g && c.b === b) || getColorById(DEFAULT_COLOR_ID);
};

// ===== Device Helpers =====

/**
 * Get light_id from MQTT status message
 * @param {Object} payload - Parsed MQTT message payload
 * @returns {string|null} Light ID or null if not found
 */
export const getLightIdFromMessage = (payload) => {
  if (payload && payload.light_id) {
    return payload.light_id;
  }
  return null;
};

// ===== Time Formatting Helpers =====

/**
 * Format total minutes into readable format: "X giờ Y phút"
 * @param {number} totalMinutes - Total minutes to format
 * @returns {string} Formatted string
 */
export const formatTime = (totalMinutes) => {
  if (!totalMinutes || totalMinutes < 0) return '0 giờ 0 phút';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  return `${hours} giờ ${minutes} phút`;
};

// ===== ThingSpeak Data Helpers =====

// Ngưỡng "khoảng trống dữ liệu": nếu 2 bản ghi ThingSpeak liên tiếp cách nhau
// hơn số phút này, coi như dữ liệu bị ngắt quãng (sim tắt, mất mạng, hoặc là
// bản ghi cũ từ phiên chạy trước) và KHÔNG cộng dồn cả khoảng đó -> tránh
// phóng đại thời gian sử dụng (VD trước đây ra 771 giờ do 1 gap nhiều ngày).
const MAX_GAP_MINUTES = 60;

/**
 * Calculate light usage time from ThingSpeak feeds.
 *
 * ThingSpeak chỉ được ESP32 upload KHI có thay đổi trạng thái (on-change), nên
 * các bản ghi thưa. Hàm tính tổng thời gian đèn ON bằng cách cộng khoảng cách
 * giữa các bản ghi liên tiếp mà bản ghi trước đó đang ON. Mỗi khoảng được giới
 * hạn ở MAX_GAP_MINUTES để một "khoảng trống" bất thường không làm sai số liệu.
 *
 * @param {Array} feeds - Array of feed entries from ThingSpeak
 * @param {string} fieldNumber - Field to check (e.g., 'field1', 'field2')
 * @returns {number} Total minutes the light was ON (đã lọc gap bất thường)
 */
export const calculateLightUsage = (feeds, fieldNumber) => {
  if (!feeds || feeds.length < 2) return 0;

  let totalMinutes = 0;

  for (let i = 0; i < feeds.length - 1; i++) {
    const isOn = feeds[i][fieldNumber] === '1';
    if (!isOn) continue; // chỉ tính khoảng mà đèn đang bật

    const t1 = new Date(feeds[i].created_at);
    const t2 = new Date(feeds[i + 1].created_at);
    const gapMinutes = (t2 - t1) / 60000;

    if (gapMinutes <= 0) continue;

    // Khoảng bình thường -> cộng đủ; khoảng quá lớn -> chặn ở ngưỡng để
    // không cộng nhầm thời gian sim đã tắt.
    totalMinutes += Math.min(gapMinutes, MAX_GAP_MINUTES);
  }

  return totalMinutes;
};

// ===== Device Query Helpers =====

/**
 * Get device IDs for a specific room
 * @param {string} roomId - Room ID (e.g., 'living', 'bedroom')
 * @returns {Array<string>} Array of device IDs belonging to the room
 */
export const getDevicesByRoom = (roomId) => {
  return Object.values(DEVICES)
    .filter(device => device.room_key === roomId)
    .map(device => device.id);
};

/**
 * Get all device IDs array (giữ thứ tự)
 * @returns {Array<string>} Array of all device IDs
 */
export const getDeviceIds = () => Object.keys(DEVICES);

/**
 * Check if device is RGB (has color picker)
 * @param {string} lightId - Device ID to check
 * @returns {boolean} True if device is RGB type
 */
export const isRGBDevice = (lightId) => {
  return DEVICES[lightId]?.type === 'rgb';
};
