import { useMQTT } from '@/context/MQTTContext';
import { IS_USING_MQTT_STATE } from '@/utils/constants.js';

/**
 * Global loading overlay hiển thị khi chờ phản hồi từ thiết bị
 * Sử dụng pendingStates từ MQTTContext làm nguồn sự thật (source of truth)
 */
const GlobalLoading = () => {
  const { pendingStates } = useMQTT();

  // Chỉ hiển thị ở production mode khi có device đang pending
  const isVisible = IS_USING_MQTT_STATE && pendingStates.size > 0;

  if (!isVisible) return null;

  return (
    <div className="global-loading-overlay">
      <div className="global-loading-spinner">
        <div className="spinner"></div>
        <div className="loading-text">Đang chờ phản hồi từ thiết bị...</div>
      </div>
    </div>
  );
};

export default GlobalLoading;
