/**
 * Global Color Constants
 * Dùng chung cho toàn bộ ứng dụng để tránh hardcode màu ở nhiều nơi
 */

// Color ID Constants - Upper case constants for type safety
export const COLOR_ID = {
  COLD_WHITE: 'cold_white',
  WARM_WHITE: 'warm_white',
  WARM_YELLOW: 'warm_yellow'
};

// ID màu mặc định - Trắng Lạnh (White Cold)
export const DEFAULT_COLOR_ID = COLOR_ID.COLD_WHITE;

// Độ sáng mặc định khi bật đèn (%)
export const DEFAULT_BRIGHTNESS = 100;

// Mảng màu nhiệt độ (Color Temperature Array) - Chứa tất cả màu
export const COLOR_ARRAY = [
  {
    id: COLOR_ID.COLD_WHITE,
    name: 'Trắng Lạnh',
    hex: '#FFFFFF',
    r: 255,
    g: 255,
    b: 255
  },
  {
    id: COLOR_ID.WARM_WHITE,
    name: 'Trắng Ấm',
    hex: '#FFBE78',
    r: 255,
    g: 190,
    b: 120
  },
  {
    id: COLOR_ID.WARM_YELLOW,
    name: 'Vàng Ấm',
    hex: '#FFAA00',
    r: 255,
    g: 170,
    b: 0
  }
];

// ========== UI Interaction Constants ==========

// Debounce delay cho slider độ sáng (ms)
// Tránh gửi quá nhiều MQTT messages khi người dùng trượt slider liên tục
export const BRIGHTNESS_DEBOUNCE_MS = 300;

// ========== MQTT Timeout Constants ==========

// Timeout chờ phản hồi status sau khi gửi control command (5 giây)
// Nếu ESP32 không gửi status về trong vòng 5s → log warning
export const CONTROL_RESPONSE_TIMEOUT = 5000;

// Timeout heartbeat của device (40 giây)
// Nếu quá 40s chưa nhận status message từ device → mark as offline
export const DEVICE_RESPONSE_TIMEOUT = 40000;

// Interval kiểm tra device timeout (5 giây)
// Check mỗi 5s xem có device nào quá 40s chưa nhận status không
export const INTERVAL_DEVICE_TIMEOUT_CHECK = 5000;

// ========== MQTT State Mode ==========

// true: UI chỉ update khi nhận status message từ device (production mode)
// false: UI update ngay lập tức khi click, không chờ MQTT response (dev mode)
export const IS_USING_MQTT_STATE = import.meta.env.VITE_IS_USING_MQTT_STATE !== 'false';
