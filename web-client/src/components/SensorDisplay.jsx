/**
 * SensorDisplay - Hiển thị nhiệt độ & độ ẩm từ cảm biến DHT22 [F1].
 * Lấy sensorData từ MQTT context (topic esp32/sensor).
 */
import { useMQTT } from '@/context/MQTTContext';

function SensorDisplay() {
  const { sensorData } = useMQTT();

  return (
    <div className="sensor-display" title="Nhiệt độ & độ ẩm phòng khách (DHT22)">
      <span className="sensor-item">
        🌡️ {sensorData ? `${sensorData.temperature.toFixed(1)}°C` : '--°C'}
      </span>
      <span className="sensor-item">
        💧 {sensorData ? `${sensorData.humidity.toFixed(0)}%` : '--%'}
      </span>
    </div>
  );
}

export default SensorDisplay;
