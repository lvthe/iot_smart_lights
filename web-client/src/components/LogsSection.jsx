import { useState, useEffect, useRef } from 'react';
import { useMQTT } from '@/context/MQTTContext';
import { DEVICES } from '@/utils/data.js';

const ConnectionStatus = ({ brokerStatus, onlineDevices, totalDevices }) => {
  const getStatusClass = (status) => {
    switch (status) {
      case 'connected':
        return 'connected';
      case 'connecting':
        return 'disconnected';
      default:
        return 'disconnected';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'Đã kết nối';
      case 'connecting':
        return 'Đang kết nối...';
      default:
        return 'Ngắt kết nối';
    }
  };

  const getDevicesStatusText = (onlineCount, totalCount) => {
    return `${onlineCount}/${totalCount} đã kết nối`;
  };

  const getDevicesStatusClass = (onlineCount, totalCount) => {
    if (onlineCount === 0) return 'disconnected';
    if (onlineCount === totalCount) return 'connected';
    return 'partial'; // Một số thiết bị chưa kết nối
  };

  return (
    <div className="connection-statuses">
      <div className="connection-status">
        <span className="status-label">MQTT Broker:</span>
        <span
          id="broker-status-indicator"
          className={`status-indicator ${getStatusClass(brokerStatus)}`}
        >
          ●
        </span>
        <span id="broker-status-text">{getStatusText(brokerStatus)}</span>
      </div>
      <div className="connection-status">
        <span className="status-label">Thiết bị:</span>
        <span
          id="devices-status-indicator"
          className={`status-indicator ${getDevicesStatusClass(onlineDevices.size, totalDevices)}`}
        >
          ●
        </span>
        <span id="devices-status-text">
          {getDevicesStatusText(onlineDevices.size, totalDevices)}
        </span>
      </div>
    </div>
  );
};

const LogsSection = ({ logs }) => {
  const { clearLogs, brokerStatus, onlineDevices } = useMQTT();
  const totalDevices = Object.keys(DEVICES).length;

  const [isPaused, setIsPaused] = useState(false);
  const logsEndRef = useRef(null);

  // Auto scroll to bottom when logs change
  useEffect(() => {
    if (!isPaused && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  const handleClearLogs = () => {
    clearLogs();
  };

  const getMessageClass = (message) => {
    if (message.includes('Không nhận được phản hồi từ thiết bị')) {
      return 'log-message-error';
    }
    if (message.includes('Đã kết nối đến HiveMQ Cloud')) {
      return 'log-message-success';
    }
    return '';
  };

  return (
    <section className="logs-section">
      <ConnectionStatus
        brokerStatus={brokerStatus}
        onlineDevices={onlineDevices}
        totalDevices={totalDevices}
      />

      <h2>📟 MQTT Message Log</h2>
      <div className="logs-controls">
        <button id="clear-logs" className="log-btn" onClick={handleClearLogs}>
          🗑️ Xóa Logs
        </button>
        <button
          id="pause-logs"
          className="log-btn"
          onClick={() => setIsPaused(!isPaused)}
          style={{
            background: isPaused ? 'var(--success)' : 'var(--warning)'
          }}
        >
          {isPaused ? '▶️ Tiếp tục' : '⏸️ Tạm dừng'}
        </button>
      </div>
      <div className="logs-container">
        <table className="logs-table">
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Loại</th>
              <th>Thao tác</th>
              <th>Topic</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr className="log-empty">
                <td colSpan="5">Đang khởi động MQTT logger...</td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className={`log-entry ${log.type}`}>
                  <td>{log.time}</td>
                  <td>
                    {log.type.toUpperCase()}
                  </td>
                  <td className="log-action">{log.action || '-'}</td>
                  <td>{log.topic}</td>
                  <td>
                    <span className={getMessageClass(log.message)}>
                      {log.message}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div ref={logsEndRef} />
      </div>
    </section>
  );
};

export default LogsSection;
