/**
 * Export helpers - chuyển dữ liệu ThingSpeak feeds sang CSV và tải xuống trình duyệt.
 */

// Chuyển mảng feeds của ThingSpeak thành chuỗi CSV
export const feedsToCSV = (feeds) => {
  if (!feeds || feeds.length === 0) return '';

  const header = ['created_at', 'field1', 'field2', 'field3', 'field4', 'field5', 'field6'];
  const rows = feeds.map(feed =>
    header.map(key => feed[key] ?? '').join(',')
  );

  return [header.join(','), ...rows].join('\n');
};

// Tạo file CSV và kích hoạt tải xuống (không cần server, dùng Blob + object URL)
export const downloadCSV = (csvString, filename = 'usage_data.csv') => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
