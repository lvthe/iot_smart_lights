# [Người B] Tính năng: Xuất CSV + lọc khoảng thời gian

> **Mảng:** Web-client · **Nhánh git:** `feature/web-export`
> **Độ khó:** Trung bình · **Ước lượng:** 1–2 buổi

---

## 1. Mục tiêu

Cho phép người dùng **tải dữ liệu sử dụng đèn về máy dạng file CSV** (mở được bằng Excel) để lưu trữ/phân tích ngoài, và **lọc theo số lượng bản ghi gần nhất** muốn xem.

Hai phần:
1. **Nút "Xuất CSV"**: xuất bảng thống kê hiện tại ra file `.csv`
2. **Bộ lọc số bản ghi**: cho chọn xem 100 / 300 / 800 bản ghi gần nhất từ ThingSpeak (800 là tối đa của free tier)

Toàn bộ tính năng đặt trong **file mới của bạn** → không đụng file người A.

---

## 2. Nền tảng có sẵn

Cấu hình ThingSpeak nằm ở [`web-client/src/configs/thingspeak.config.js`](../../web-client/src/configs/thingspeak.config.js). Hàm `url()` nhận tham số `results` (số bản ghi) — đây là thứ bạn sẽ điều khiển bằng bộ lọc.

Dữ liệu thô là mảng `data.feeds` (mỗi phần tử có `created_at`, `field1`..`field6`) — bạn sẽ chuyển mảng này thành CSV.

---

## 3. Các bước thực hiện

### Bước 1 — Tạo hàm chuyển dữ liệu sang CSV

Tạo file mới `web-client/src/utils/export.js`:

```js
// Chuyển mảng feeds của ThingSpeak thành chuỗi CSV
export const feedsToCSV = (feeds) => {
  if (!feeds || feeds.length === 0) return '';

  const header = ['created_at', 'field1', 'field2', 'field3', 'field4', 'field5', 'field6'];
  const rows = feeds.map(feed =>
    header.map(key => feed[key] ?? '').join(',')
  );

  return [header.join(','), ...rows].join('\n');
};

// Tạo file CSV và kích hoạt tải xuống trên trình duyệt
export const downloadCSV = (csvString, filename = 'usage_data.csv') => {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
```

### Bước 2 — Tạo component thanh công cụ

Tạo file mới `web-client/src/components/ExportBar.jsx`:

```jsx
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
      <label>
        Số bản ghi:{' '}
        <select value={resultsLimit} onChange={e => onLimitChange(Number(e.target.value))}>
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
```

### Bước 3 — Nối vào ActivityLog

> ⚠️ **Phần này chạm file chung `ActivityLog.jsx` — cùng file với người A.** Để tránh đụng nhau: A thêm code ở khu vực **biểu đồ (trên bảng)**, bạn thêm ở khu vực **thanh công cụ (trên biểu đồ)** và phần **state `resultsLimit`**. Hẹn nhau merge lần lượt, hoặc 1 người pull code người kia về trước khi thêm.

Trong [`ActivityLog.jsx`](../../web-client/src/components/ActivityLog.jsx):

1. Thêm import:
```js
import ExportBar from './ExportBar';
```

2. Thêm state cho số bản ghi (gần các `useState` đầu component):
```js
const [resultsLimit, setResultsLimit] = useState(THINGSPEAK_CONFIG.results);
```

3. Trong hàm fetch, dùng `resultsLimit` thay cho `THINGSPEAK_CONFIG.results`:
```js
THINGSPEAK_CONFIG.url(THINGSPEAK_CONFIG.channelId, THINGSPEAK_CONFIG.readApiKey, resultsLimit)
```
Và thêm `resultsLimit` vào dependency array của `useEffect` để tự tải lại khi đổi bộ lọc.

4. Đặt `<ExportBar>` ngay dưới `summary-card`:
```jsx
<ExportBar
  feeds={data.feeds}
  resultsLimit={resultsLimit}
  onLimitChange={setResultsLimit}
/>
```

### Bước 4 — (tùy chọn) Style

Thêm class `.export-bar`, `.export-btn` vào CSS.

---

## 4. Ranh giới code (tránh đụng người A)

| Được sửa/tạo | Phối hợp với A |
|---|---|
| ✅ Tạo mới `utils/export.js` | ⚠️ `ActivityLog.jsx` — chung với A, chia vùng rõ (xem Bước 3) |
| ✅ Tạo mới `components/ExportBar.jsx` | ❌ Không đụng `components/UsageChart.jsx` (của A) |

---

## 5. Kiểm tra hoàn thành

```bash
cd web-client
npm run test:run   # 81 test cũ vẫn xanh
npm run dev        # tab Activity → đổi bộ lọc thấy dữ liệu tải lại → bấm Xuất CSV → mở file bằng Excel
```

---

## 6. Gợi ý nội dung báo cáo

- **Vấn đề**: dữ liệu chỉ xem được trên web, không mang ra ngoài phân tích được → cần export
- **Kỹ thuật**: giải thích cách tạo file tải xuống bằng `Blob` + `URL.createObjectURL` (không cần server), định dạng CSV
- **Demo**: quay/chụp thao tác đổi bộ lọc và mở file CSV trong Excel
- **Khó khăn thường gặp**: dấu phẩy trong dữ liệu làm vỡ cột CSV (ở đây field toàn số 0/1 nên an toàn — nhưng nên nêu ra như một điểm cần lưu ý nếu dữ liệu phức tạp hơn)
- **Phát triển tiếp**: lọc theo khoảng ngày cụ thể (ThingSpeak hỗ trợ tham số `start`/`end`), xuất thêm định dạng JSON
