import { memo } from 'react';
import { useMQTT } from '@/context/MQTTContext';
import { DEVICES } from '@/utils/data.js';
import { IS_USING_MQTT_STATE, DEFAULT_BRIGHTNESS, DEFAULT_COLOR_ID } from '@/utils/constants.js';

const GlobalToggle = memo(() => {
  const { deviceStates, publishControl, isConnected } = useMQTT();

  // In dev mode, always enable buttons; in production, require MQTT connection
  const isDisabled = IS_USING_MQTT_STATE ? !isConnected : false;

  // Turn on all lights
  const turnOnAll = () => {
    console.log('💡 [GlobalToggle] Turn ON all lights');
    Object.keys(DEVICES).forEach(lightId => {
      const currentState = deviceStates[lightId];
      console.log('  - Turning on:', lightId);

      publishControl(
        lightId,
        true,
        currentState?.brightness || DEFAULT_BRIGHTNESS,
        DEFAULT_COLOR_ID
      );
    });
  };

  // Turn off all lights
  const turnOffAll = () => {
    console.log('💡 [GlobalToggle] Turn OFF all lights');
    Object.keys(DEVICES).forEach(lightId => {
      const currentState = deviceStates[lightId];
      console.log('  - Turning off:', lightId);

      publishControl(
        lightId,
        false,
        currentState?.brightness || DEFAULT_BRIGHTNESS,
        DEFAULT_COLOR_ID
      );
    });
  };

  // Get button title based on mode and connection status
  const getButtonTitle = (isTurnOn) => {
    if (!IS_USING_MQTT_STATE) {
      return isTurnOn ? 'Bật tất cả đèn (Dev Mode)' : 'Tắt tất cả đèn (Dev Mode)';
    }
    return isConnected
      ? (isTurnOn ? 'Bật tất cả đèn' : 'Tắt tất cả đèn')
      : 'Chưa kết nối MQTT';
  };

  return (
    <div className="global-toggle">
      <button
        className="global-toggle-button turn-on"
        onClick={turnOnAll}
        disabled={isDisabled}
        title={getButtonTitle(true)}
      >
        <span className="toggle-icon">💡</span>
        <span className="toggle-text">Bật Tất Cả</span>
      </button>
      <button
        className="global-toggle-button turn-off"
        onClick={turnOffAll}
        disabled={isDisabled}
        title={getButtonTitle(false)}
      >
        <span className="toggle-icon icon-off">💡</span>
        <span className="toggle-text">Tắt Tất Cả</span>
      </button>
    </div>
  );
});

export default GlobalToggle;
