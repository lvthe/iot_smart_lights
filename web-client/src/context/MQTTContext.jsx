import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as Paho from 'paho-mqtt';
import MQTT_CONFIG from '@/configs/mqtt.config.js';
import { IS_USING_MQTT_STATE, CONTROL_RESPONSE_TIMEOUT, DEVICE_RESPONSE_TIMEOUT, INTERVAL_DEVICE_TIMEOUT_CHECK } from '@/utils/constants.js';
import { TOPICS } from '@/utils/topics.js';
import { getDeviceIds, isRGBDevice } from '@/utils/helpers.js';
import { DEFAULT_COLOR_ID, DEFAULT_BRIGHTNESS } from '@/utils/constants.js';
import { getColorById, findColorByRGB } from '@/utils/helpers.js';

// Create context
const MQTTContext = createContext(null);

// Initial device states - same default for both modes
const getInitialDeviceStates = () => {
  return getDeviceIds().reduce((acc, lightId) => {
    acc[lightId] = {
      on: false,
      brightness: DEFAULT_BRIGHTNESS,
      color: getColorById(DEFAULT_COLOR_ID)
    };
    return acc;
  }, {});
};

// Export context provider
export const MQTTProvider = ({ children }) => {
  // Initial broker status based on mode
  const initialBrokerStatus = IS_USING_MQTT_STATE ? 'disconnected' : 'dev-mode';

  const [isConnected, setIsConnected] = useState(false);
  const [brokerStatus, setBrokerStatus] = useState(initialBrokerStatus);
  const [deviceStates, setDeviceStates] = useState(getInitialDeviceStates);
  const [onlineDevices, setOnlineDevices] = useState(new Set());
  const [logs, setLogs] = useState([]);
  const [pendingStates, setPendingStates] = useState(new Set()); // Devices waiting for MQTT response
  const [sensorData, setSensorData] = useState(null); // [F1] { temperature, humidity, updatedAt }

  const mqttClient = useRef(null);
  const lastSeenTime = useRef({});
  const deviceTimeoutCheckRef = useRef(null);
  const pendingTimeoutsRef = useRef({});
  const deviceStatesRef = useRef(null);
  const logIdCounterRef = useRef(0);
  const isInitializingRef = useRef(false);
  const pendingStartTimeRef = useRef({}); // Track khi device bắt đầu pending
  const connectTimeoutRef = useRef(null); // setTimeout id của lần connectMQTT() đã lên lịch

  // Keep ref updated with latest deviceStates
  useEffect(() => {
    deviceStatesRef.current = deviceStates;
  }, [deviceStates]);

  // Log once on mount
  useEffect(() => {
    console.log('IS_USING_MQTT_STATE:', IS_USING_MQTT_STATE);
    console.log('MQTT Broker:', MQTT_CONFIG.broker);
  }, []);

  // Add log entry
  const addLog = useCallback((type, topic, message, action = '-') => {
    logIdCounterRef.current += 1;
    const entry = {
      id: logIdCounterRef.current,
      time: new Date().toLocaleTimeString('vi-VN'),
      type,
      topic,
      message,
      action
    };
    setLogs(prev => [...prev, entry].slice(-100));
  }, []);

  // Update broker status
  const updateBrokerStatus = useCallback((status) => {
    setBrokerStatus(status);
    if (status === 'connected') {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, []);

  // Update device card status
  const updateDeviceCardStatus = useCallback((lightId, isOnline) => {
    setOnlineDevices(prev => {
      const newSet = new Set(prev);
      if (isOnline) {
        newSet.add(lightId);
      } else {
        newSet.delete(lightId);
      }
      return newSet;
    });
  }, []);

  // Update device UI state
  const updateDeviceState = useCallback((lightId, newState, isLocal = false, action = '-') => {
    if (isLocal && !IS_USING_MQTT_STATE) {
      setDeviceStates(prev => {
        let updatedDevice = { ...prev[lightId] };

        if (newState.on !== undefined) {
          updatedDevice.on = newState.on;
        }

        const isTurningOn = newState.on === true;
        const isExplicitChange = newState.brightness !== undefined || newState.color !== undefined;

        if (isTurningOn || isExplicitChange) {
          if (newState.brightness !== undefined) {
            updatedDevice.brightness = newState.brightness;
          }
          if (newState.color !== undefined) {
            updatedDevice.color = newState.color;
          }
        }

        const updated = {
          ...prev,
          [lightId]: updatedDevice
        };

        const topic = TOPICS.status;
        const message = JSON.stringify({
          light_id: lightId,
          state: updatedDevice.on ? 'ON' : 'OFF',
          brightness: updatedDevice.brightness,
          color: updatedDevice.color
        });
        addLog('status-local', topic, message + ' (local only)', action);

        return updated;
      });
    } else {
      setDeviceStates(prev => {
        let updatedDevice = { ...prev[lightId] };

        if (newState.on !== undefined) {
          updatedDevice.on = newState.on;
        }

        if (newState.on === true || (newState.on === undefined && (newState.brightness !== undefined || newState.color !== undefined))) {
          if (newState.brightness !== undefined) {
            updatedDevice.brightness = newState.brightness;
          }
          if (newState.color !== undefined) {
            updatedDevice.color = newState.color;
          }
        }

        const updated = {
          ...prev,
          [lightId]: updatedDevice
        };
        return updated;
      });
    }
  }, [addLog]);

  // Clear device pending state
  const clearDevicePending = useCallback((lightId) => {
    if (pendingTimeoutsRef.current[lightId]) {
      clearTimeout(pendingTimeoutsRef.current[lightId]);
      delete pendingTimeoutsRef.current[lightId];
    }

    // Log thời gian phản hồi
    const pendingStart = pendingStartTimeRef.current[lightId];
    if (pendingStart) {
      const elapsed = performance.now() - pendingStart;
      console.log(`⏱️ [MQTT ROUNDTRIP] ${lightId}: ${elapsed.toFixed(0)}ms (send → receive)`);
      delete pendingStartTimeRef.current[lightId];
    }

    setPendingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(lightId);
      return newSet;
    });
  }, []);

  // Set device as pending (waiting for MQTT response)
  const setDevicePending = useCallback((lightId, sendTime = null) => {
    const pendingStart = sendTime || performance.now();
    pendingStartTimeRef.current[lightId] = pendingStart;

    setPendingStates(prev => {
      const newSet = new Set([...prev, lightId]);
      return newSet;
    });

    if (pendingTimeoutsRef.current[lightId]) {
      clearTimeout(pendingTimeoutsRef.current[lightId]);
    }

    pendingTimeoutsRef.current[lightId] = setTimeout(() => {
      // Trực tiếp clear state, không gọi clearDevicePending để tránh stale closure
      setPendingStates(prev => {
        const newSet = new Set(prev);
        newSet.delete(lightId);
        return newSet;
      });
      delete pendingTimeoutsRef.current[lightId];
      delete pendingStartTimeRef.current[lightId];
      // Mark device as offline since no response received
      updateDeviceCardStatus(lightId, false);
      addLog('system', TOPICS.status, `Không nhận được phản hồi từ ${lightId}`);
    }, CONTROL_RESPONSE_TIMEOUT);
  }, [addLog, updateDeviceCardStatus]);

  // Publish control message
  const publishControl = useCallback((lightId, state, brightness, colorId) => {
    let action = 'Bật/Tắt';

    // Validate inputs
    if (!lightId || !getDeviceIds().includes(lightId)) {
      console.error('Invalid lightId:', lightId);
      return false;
    }

    // In dev mode, skip MQTT connection check
    if (IS_USING_MQTT_STATE && (!isConnected || !mqttClient.current)) {
      addLog('system', '-', 'Chưa kết nối MQTT!');
      return false;
    }

    const topic = TOPICS.control;
    const messageObj = {
      light_id: lightId,
      state: state ? 'ON' : 'OFF',
      brightness: brightness
    };

    // Only add colorId for RGB devices (not bathroom)
    if (isRGBDevice(lightId) && colorId !== undefined) {
      messageObj.colorId = colorId;
    }

    const message = JSON.stringify(messageObj);

    // In dev mode, only update local state
    if (!IS_USING_MQTT_STATE) {
      const currentState = deviceStatesRef.current[lightId] || {
        on: false,
        brightness: DEFAULT_BRIGHTNESS,
        color: getColorById(DEFAULT_COLOR_ID)
      };

      // Skip nếu trạng thái không thay đổi (dev mode)
      const stateChanged = currentState.on !== state;
      const brightnessChanged = currentState.brightness !== brightness;
      const colorChanged = isRGBDevice(lightId) && currentState.color?.id !== colorId;

      if (!stateChanged && !brightnessChanged && !colorChanged) {
        console.log('⏭️ [DEV SKIP] Trạng thái không thay đổi');
        return false;
      }

      if (currentState.on === state && currentState.brightness !== brightness) {
        action = 'Độ sáng';
      }

      const color = isRGBDevice(lightId) ? getColorById(colorId || DEFAULT_COLOR_ID) : null;
      addLog('control-local', topic, message + ' (local only)', action);
      updateDeviceState(lightId, { on: state, brightness, color }, true, action);
      return true;
    }

    // In production mode, publish to MQTT
    const currentState = deviceStatesRef.current[lightId] || {
      on: false,
      brightness: DEFAULT_BRIGHTNESS,
      color: getColorById(DEFAULT_COLOR_ID)
    };

    // Skip gửi MQTT nếu trạng thái không thay đổi
    const stateChanged = currentState.on !== state;
    const brightnessChanged = currentState.brightness !== brightness;
    const colorChanged = isRGBDevice(lightId) && currentState.color?.id !== colorId;

    if (!stateChanged && !brightnessChanged && !colorChanged) {
      console.log('⏭️ [MQTT SKIP] Trạng thái không thay đổi, không gửi MQTT');
      addLog('system', '-', `⏭️ Bỏ qua: ${lightId} trạng thái không thay đổi`);
      return false;
    }

    if (currentState.on === state && currentState.brightness !== brightness) {
      action = 'Độ sáng';
    }

    try {
      const sendTime = performance.now();
      console.log(`📤 [MQTT SEND] ${sendTime.toFixed(0)}ms | Topic:`, topic, 'Message:', message, 'Device:', lightId);
      // Paho publish requires QoS level (0=fireAndForget, 1=atLeastOnce, 2=exactlyOnce)
      mqttClient.current.publish(topic, message, 0, false);
      addLog('control', topic, message, action);
      setDevicePending(lightId, sendTime); // Pass sendTime để track
      return true;
    } catch (e) {
      console.error('Publish error:', e);
      return false;
    }
  }, [isConnected, addLog, updateDeviceState, setDevicePending]);

  // Handle incoming message
  const onMessageArrived = useCallback((message) => {
    const topic = message.destinationName;
    const payload = message.payloadString;
    const receiveTime = performance.now();

    console.log(`📥 [MQTT RECEIVE] ${receiveTime.toFixed(0)}ms | Topic:`, topic, 'Payload:', payload);
    addLog('status', topic, payload);

    // [F1] Message cảm biến DHT22 (nhiệt độ/độ ẩm) - topic riêng, không có light_id
    if (topic === TOPICS.sensor) {
      try {
        const s = JSON.parse(payload);
        if (typeof s.temperature === 'number' && typeof s.humidity === 'number') {
          setSensorData({ temperature: s.temperature, humidity: s.humidity, updatedAt: Date.now() });
        }
      } catch (e) {
        console.error('Error parsing sensor message:', e);
      }
      return;
    }

    // Parse payload to get light_id
    try {
      const data = JSON.parse(payload);
      const lightId = data.light_id;

      if (!lightId || !getDeviceIds().includes(lightId)) {
        console.error('Invalid or missing light_id:', lightId);
        return;
      }

      // Clear pending state
      clearDevicePending(lightId);

      // Track device as online
      const now = Date.now();
      lastSeenTime.current[lightId] = now;
      updateDeviceCardStatus(lightId, true);

      // Update device state
      const isOn = data.state === 'ON';
      const newState = { on: isOn };

      // Luôn update brightness và color từ ESP (kể cả khi OFF)
      // để sync đúng state khi ESP restart hoặc thay đổi settings khi OFF
      newState.brightness = data.brightness;

      // Only parse color for RGB devices
      if (isRGBDevice(lightId)) {
        if (data.color) {
          newState.color = findColorByRGB(data.color.r, data.color.g, data.color.b);
        } else if (data.colorId) {
          newState.color = getColorById(data.colorId);
        }
      }

      updateDeviceState(lightId, newState);
    } catch (e) {
      console.error('Error parsing MQTT message:', e);
    }
  }, [addLog, updateDeviceCardStatus, updateDeviceState, clearDevicePending]);

  // Handle connection lost
  const onConnectionLost = useCallback((responseObject) => {
    setIsConnected(false);
    updateBrokerStatus('disconnected');

    if (responseObject.errorCode !== 0) {
      addLog('system', '-', 'Mất kết nối: ' + responseObject.errorMessage);
    }

    setOnlineDevices(new Set());
  }, [updateBrokerStatus, addLog]);

  // Connect to MQTT
  const connectMQTT = useCallback(() => {
    const clientId = MQTT_CONFIG.clientId;

    // Paho Client for WebSocket requires path "/mqtt"
    const client = new Paho.Client(
      MQTT_CONFIG.broker,
      MQTT_CONFIG.port,
      "/mqtt",
      clientId
    );

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const connectOptions = {
      onSuccess: () => {
        setIsConnected(true);
        updateBrokerStatus('connected');

        // Subscribe to status + sensor topics
        client.subscribe(TOPICS.status);
        client.subscribe(TOPICS.sensor); // [F1] nhiệt độ/độ ẩm DHT22
        console.log('✅ Subscribed to:', TOPICS.status, TOPICS.sensor);

        const now = Date.now();
        // Optimistic online + ghi lastSeenTime. KHÔNG setDevicePending ở đây:
        // ESP32 broadcast status theo lịch riêng (mỗi STATUS_BROADCAST_INTERVAL),
        // nên áp timeout 5s ngay lúc mới kết nối sẽ khiến cả 6 đèn báo "mất phản hồi"
        // trước khi broadcast đầu tiên kịp tới -> chập chờn. Thay vào đó để
        // DEVICE_RESPONSE_TIMEOUT (40s) + broadcast định kỳ tự đồng bộ.
        getDeviceIds().forEach(lightId => {
          lastSeenTime.current[lightId] = now;
          updateDeviceCardStatus(lightId, true);
        });

        addLog('system', '-', 'Đã kết nối đến EMQX Broker');
      },
      onFailure: (responseObject) => {
        setIsConnected(false);
        updateBrokerStatus('disconnected');
        addLog('system', '-', 'Kết nối thất bại: ' + responseObject.errorMessage);
      },
      useSSL: true,
      userName: MQTT_CONFIG.username,
      password: MQTT_CONFIG.password
    };

    try {
      client.connect(connectOptions);
      mqttClient.current = client;
      updateBrokerStatus('connecting');
    } catch (e) {
      console.error('Connection error:', e);
      addLog('system', '-', 'Lỗi kết nối: ' + e.message);
    }
  }, [onConnectionLost, onMessageArrived, updateBrokerStatus, addLog, updateDeviceCardStatus]);

  // Start device timeout check
  const startDeviceTimeoutCheck = useCallback(() => {
    if (deviceTimeoutCheckRef.current) {
      clearInterval(deviceTimeoutCheckRef.current);
    }

    deviceTimeoutCheckRef.current = setInterval(() => {
      const now = Date.now();

      getDeviceIds().forEach(lightId => {
        if (lastSeenTime.current[lightId] && now - lastSeenTime.current[lightId] > DEVICE_RESPONSE_TIMEOUT) {
          if (onlineDevices.has(lightId)) {
            updateDeviceCardStatus(lightId, false);
            addLog('system', '-', `Thiết bị ${lightId} timeout`);
          }
        }
      });
    }, INTERVAL_DEVICE_TIMEOUT_CHECK);
  }, [onlineDevices, updateDeviceCardStatus, addLog]);

  // Initialize MQTT connection (only in production mode)
  useEffect(() => {
    if (!IS_USING_MQTT_STATE || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    // Wrap in setTimeout to avoid synchronous setState
    connectTimeoutRef.current = setTimeout(() => {
      connectTimeoutRef.current = null;
      connectMQTT();
    }, 0);

    return () => {
      // Hủy lịch connectMQTT() nếu chưa kịp chạy - tránh tạo 2 client cùng lúc
      // (React StrictMode chạy effect 2 lần ở dev mode, mount -> cleanup -> mount lại)
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      if (deviceTimeoutCheckRef.current) {
        clearInterval(deviceTimeoutCheckRef.current);
      }
      if (mqttClient.current) {
        try {
          mqttClient.current.disconnect();
        } catch (e) {
          console.error('Disconnect error:', e);
        }
        mqttClient.current = null;
      }
      Object.values(pendingTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });
      pendingTimeoutsRef.current = {};
      isInitializingRef.current = false;
    };
  }, [connectMQTT]);

  // Start timeout check when connected
  useEffect(() => {
    if (isConnected) {
      startDeviceTimeoutCheck();
    }

    return () => {
      if (deviceTimeoutCheckRef.current) {
        clearInterval(deviceTimeoutCheckRef.current);
      }
    };
  }, [isConnected, startDeviceTimeoutCheck]);

  // Force re-render mỗi giây để countdown update (chỉ khi connected)
  const [, forceUpdate] = useState({});
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      forceUpdate({});
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected, forceUpdate]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog('system', '-', 'Logs đã được xóa');
  }, [addLog]);

  // Memoize context value
  const value = useMemo(() => ({
    isConnected,
    brokerStatus,
    deviceStates,
    onlineDevices,
    logs,
    pendingStates,
    sensorData,
    publishControl,
    addLog,
    updateDeviceState,
    clearLogs
  }), [
    isConnected,
    brokerStatus,
    deviceStates,
    onlineDevices,
    logs,
    pendingStates,
    sensorData,
    publishControl,
    addLog,
    updateDeviceState,
    clearLogs
  ]);

  return (
    <MQTTContext.Provider value={value}>
      {children}
    </MQTTContext.Provider>
  );
};

// Custom hook to use MQTT context
export const useMQTT = () => {
  const context = useContext(MQTTContext);
  if (!context) {
    throw new Error('useMQTT must be used within MQTTProvider');
  }
  return context;
};

export default MQTTContext;
