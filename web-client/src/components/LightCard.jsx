import { memo, useCallback, useRef } from 'react';
import { DEVICES } from '@/utils/data.js';
import { isRGBDevice } from '@/utils/helpers.js';
import { useMQTT } from '@/context/MQTTContext';
import { DEFAULT_COLOR_ID, DEFAULT_BRIGHTNESS, COLOR_ID, COLOR_ARRAY, IS_USING_MQTT_STATE, BRIGHTNESS_DEBOUNCE_MS } from '@/utils/constants.js';
import { getColorById } from '@/utils/helpers.js';

const LightCard = memo(({ lightId }) => {
  const { deviceStates, publishControl, isConnected, onlineDevices } = useMQTT();
  const brightnessTimeoutRef = useRef(null);

  // Check if device is online
  const isOnline = onlineDevices.has(lightId);

  // In dev mode, always enable; in production, require MQTT connection
  const isDisabled = IS_USING_MQTT_STATE ? !isConnected : false;

  const device = DEVICES[lightId];
  const isRGB = isRGBDevice(lightId);
  const defaultColor = getColorById(DEFAULT_COLOR_ID);

  const state = deviceStates[lightId] ? {
    on: deviceStates[lightId].on ?? false,
    brightness: deviceStates[lightId].brightness ?? DEFAULT_BRIGHTNESS,
    color: deviceStates[lightId].color ?? defaultColor
  } : { on: false, brightness: DEFAULT_BRIGHTNESS, color: defaultColor };

  // RGB to Hex conversion
  const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  };

  const currentColorHex = rgbToHex(state.color.r, state.color.g, state.color.b);

  // Check if current color is COLD_WHITE (for enhanced glow effect)
  const isColdWhite = state.color?.id === COLOR_ID.COLD_WHITE;

  // Handle power toggle
  const handlePowerToggle = () => {
    // Prevent toggle if MQTT is not connected
    if (isDisabled) {
      console.warn('⚠️ [LightCard] Cannot toggle - MQTT not connected');
      return;
    }

    // Keep current color and brightness when toggling (don't reset to DEFAULT)
    const newColorId = state.color.id;
    const brightness = state.brightness;
    console.log('💡 [LightCard] Power toggle - Device:', lightId, 'New state:', !state.on, 'Brightness:', brightness, 'Color:', newColorId);

    publishControl(lightId, !state.on, brightness, newColorId);
  };

  // Handle brightness change with debounce
  const handleBrightnessChange = useCallback((e) => {
    const newBrightness = parseInt(e.target.value);

    // Clear previous timeout if exists
    if (brightnessTimeoutRef.current) {
      clearTimeout(brightnessTimeoutRef.current);
    }

    if (state.on) {
      // Set new timeout to debounce the publish
      brightnessTimeoutRef.current = setTimeout(() => {
        console.log('☀️ [LightCard] Brightness change - Device:', lightId, 'New brightness:', newBrightness);
        publishControl(lightId, true, newBrightness, state.color.id);
      }, BRIGHTNESS_DEBOUNCE_MS);
    }
  }, [state.on, state.color.id, lightId, publishControl]);

  // Handle color selection
  const handleColorSelect = (color) => {
    console.log('🌈 [LightCard] Color select - Device:', lightId, 'Color:', color.id);
    if (state.on) {
      publishControl(lightId, true, state.brightness, color.id);
    }
  };

  return (
    <div
      className={`light-card ${state.on ? 'on' : ''} ${isColdWhite ? 'cold-white' : ''}`}
      data-device={lightId}
      style={{ '--active-color': currentColorHex }}
    >
      <div className="card-header">
        <div>
          <div className="card-title">{device.name}</div>
          <div className="device-connection-status">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span className="status-text">
              {isOnline ? 'Đã kết nối' : 'Không thể kết nối'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span
            className="card-icon"
            style={{
              color: state.on ? currentColorHex : '',
              textShadow: state.on ? `0 0 ${isColdWhite ? 20 + state.brightness / 2 : 12 + state.brightness / 3}px ${currentColorHex}, ${isColdWhite ? `0 0 ${30 + state.brightness / 1.5}px ${currentColorHex}` : ''}` : ''
            }}
          >
            💡
          </span>
          <label
            className={`power-toggle ${state.on ? 'on' : 'off'} ${isDisabled ? 'disabled' : ''}`}
            title={isDisabled ? 'Chưa kết nối MQTT!' : ''}
          >
            <input
              type="checkbox"
              checked={state.on}
              onChange={handlePowerToggle}
              disabled={isDisabled}
            />
            <span className="slider-sw"></span>
          </label>
        </div>
      </div>

      <div className="card-body">
        <div className="card-controls">
          <div className="control-row">
            <div className="control-label">☀️ Độ sáng</div>
            <input
              type="range"
              className="brightness-slider"
              min="0"
              max="100"
              value={state.brightness}
              onChange={handleBrightnessChange}
              disabled={!state.on}
            />
            <div className="brightness-value">{state.brightness}%</div>
          </div>

          {/* Only show color picker for RGB devices */}
          {isRGB && (
            <div className="control-row">
              <div className="control-label">🌈 Màu sắc</div>
              <div className="color-presets">
                {COLOR_ARRAY.map((preset) => {
                  const isSelected = state.color?.id === preset.id;
                  return (
                    <div
                      key={preset.id}
                      className={`color-preset-wrapper ${isSelected ? 'selected' : ''}`}
                    >
                      <button
                        className={`color-preset-btn ${!state.on ? 'disabled' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        onClick={() => handleColorSelect(preset)}
                        disabled={!state.on}
                        title={preset.name}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default LightCard;
