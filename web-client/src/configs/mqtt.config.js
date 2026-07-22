// MQTT Configuration from environment variables
// Cấu hình EMQX theo Credentials_EMQX.txt

// Hậu tố ngẫu nhiên cho mỗi lần load trang - tránh trùng Client ID với tab/máy khác
// đang dùng chung VITE_MQTT_CLIENT_ID (EMQX sẽ đá kết nối cũ khi 2 client cùng ID).
const uniqueSuffix = Math.random().toString(16).slice(2, 8);
const baseClientId = import.meta.env.VITE_MQTT_CLIENT_ID || 'web_client';

const MQTT_CONFIG = {
  broker: import.meta.env.VITE_MQTT_BROKER,
  port: parseInt(import.meta.env.VITE_MQTT_PORT),
  username: import.meta.env.VITE_MQTT_USERNAME,
  password: import.meta.env.VITE_MQTT_PASSWORD,
  clientId: `${baseClientId}_${uniqueSuffix}`,
};

export default MQTT_CONFIG;
