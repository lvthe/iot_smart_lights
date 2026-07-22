/**
 * ActivityLog - Displays light usage statistics from ThingSpeak
 * Fetches data from ThingSpeak API and calculates usage time per light
 */
import React, { useState, useEffect } from 'react';
import THINGSPEAK_CONFIG from '@/configs/thingspeak.config';
import { DEVICES } from '@/utils/data.js';
import { formatTime, calculateLightUsage } from '@/utils/helpers.js';

function ActivityLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!THINGSPEAK_CONFIG.channelId || !THINGSPEAK_CONFIG.readApiKey) {
        throw new Error('Thiếu ThingSpeak Channel ID hoặc Read API Key. Vui lòng kiểm tra file .env');
      }

      const response = await fetch(
        THINGSPEAK_CONFIG.url(
          THINGSPEAK_CONFIG.channelId,
          THINGSPEAK_CONFIG.readApiKey,
          THINGSPEAK_CONFIG.results
        )
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!THINGSPEAK_CONFIG.channelId || !THINGSPEAK_CONFIG.readApiKey) {
          throw new Error('Thiếu ThingSpeak Channel ID hoặc Read API Key. Vui lòng kiểm tra file .env');
        }

        const response = await fetch(
          THINGSPEAK_CONFIG.url(
            THINGSPEAK_CONFIG.channelId,
            THINGSPEAK_CONFIG.readApiKey,
            THINGSPEAK_CONFIG.results
          )
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const json = await response.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Fetch error:', err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Error state
  if (error) {
    return (
      <div className="activity-log">
        <div className="activity-header">
          <button onClick={fetchData} className="refresh-btn">🔄 Thử lại</button>
        </div>
        <div className="error-container">
          <p className="error-message">⚠️ {error}</p>
          <p className="error-hint">
            Hãy đảm bảo bạn đã cấu hình ThingSpeak Channel ID và Read API Key trong file .env
          </p>
        </div>
      </div>
    );
  }

  // Derived calculations từ UsageStatsTable
  const lights = Object.values(DEVICES).map(device => ({
    name: device.name,
    field: device.field_thingspeak,
  }));

  const stats = data?.feeds ? lights.map(light => ({
    ...light,
    totalMinutes: calculateLightUsage(data.feeds, light.field)
  })) : [];

  const totalAllLights = stats.reduce((sum, stat) => sum + stat.totalMinutes, 0);

  // Main render
  return (
    <div className="activity-log">
      {/* Content khi có data */}
      {!loading && data && (
        <>
          {/* Empty state khi không có feeds */}
          {!data.feeds?.length && (
            <div className="usage-empty">
              <p>Không có dữ liệu. Hãy đảm bảo ESP32 đang ghi log lên ThingSpeak.</p>
            </div>
          )}

          {/* Usage stats khi có feeds */}
          {data.feeds?.length > 0 && (
            <div className="usage-stats">
              {/* Summary card - Tổng thời gian sử dụng */}
              <div className="summary-card">
                <h3>Tổng thời gian sử dụng: </h3>
                <p className="summary-value">{formatTime(totalAllLights)}</p>
              </div>

              {/* Cập nhật lần cuối */}
              <div className="last-update">
                Cập nhật lần cuối: {new Date(data.feeds[data.feeds.length - 1].created_at).toLocaleString('vi-VN')}
              </div>

              {/* Kết quả: x bản ghi */}
              <div className="records-info">
                Kết quả: {data.feeds.length} bản ghi
              </div>

              {/* Button Làm mới */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="refresh-btn"
              >
                🔄 {loading ? 'Đang tải...' : 'Làm mới'}
              </button>

              {/* Table */}
              <table className="usage-table">
                <thead>
                  <tr>
                    <th>Vị trí đèn</th>
                    <th>Thời gian sử dụng</th>
                    <th>Chiếm</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map(stat => {
                    const percentage = totalAllLights > 0
                      ? ((stat.totalMinutes / totalAllLights) * 100).toFixed(2)
                      : '0.00';
                    return (
                      <tr key={stat.field}>
                        <td>{stat.name}</td>
                        <td className="time-value">{formatTime(stat.totalMinutes)}</td>
                        <td className="percentage-value">
                          {parseFloat(percentage) > 0 ? `${percentage}%` : '-'}
                          {parseFloat(percentage) > 0 && (
                            <div
                              className="percentage-bar"
                              style={{ width: `${percentage}%` }}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* No data state */}
      {!loading && !data && (
        <div className="loading-state">
          <p>Chưa có dữ liệu</p>
        </div>
      )}
    </div>
  );
}

export default ActivityLog;
