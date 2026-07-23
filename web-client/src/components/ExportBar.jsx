/**
 * ExportBar - Thanh công cụ: chọn số bản ghi tải về và nút xuất CSV.
 */
import { feedsToCSV, downloadCSV } from '@/utils/export.js';

function ExportBar({ feeds, resultsLimit, onLimitChange }) {
  const handleExport = () => {
    const csv = feedsToCSV(feeds);
    if (!csv) {
      alert('Chưa có dữ liệu để xuất.');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `usage_${today}.csv`);
  };

  return (
    <div className="export-bar">
      <label className="export-limit">
        Số bản ghi:{' '}
        <select
          value={resultsLimit}
          onChange={e => onLimitChange(Number(e.target.value))}
        >
          <option value={100}>100 gần nhất</option>
          <option value={300}>300 gần nhất</option>
          <option value={800}>800 (tối đa)</option>
        </select>
      </label>
      <button onClick={handleExport} className="export-btn">⬇️ Xuất CSV</button>
    </div>
  );
}

export default ExportBar;
