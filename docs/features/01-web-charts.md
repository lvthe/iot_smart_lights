# [Người A] Tính năng: Biểu đồ thống kê sử dụng đèn

> **Mảng:** Web-client · **Nhánh git:** `feature/web-charts`
> **Độ khó:** Trung bình · **Ước lượng:** 1–2 buổi

---

## 1. Mục tiêu

Hiện tại tab **Activity** ([`ActivityLog.jsx`](../../web-client/src/components/ActivityLog.jsx)) chỉ hiển thị dữ liệu sử dụng đèn dưới dạng **bảng số**. Tính năng này thêm **biểu đồ trực quan** để người dùng nhìn nhanh đèn nào dùng nhiều/ít:

- **Biểu đồ cột (bar chart)**: so sánh thời gian dùng của 6 đèn
- **Biểu đồ tròn (pie/doughnut chart)**: tỷ lệ % mỗi đèn chiếm trong tổng thời gian

Dữ liệu đã được tính sẵn trong `ActivityLog.jsx` — bạn chỉ cần **hiển thị nó bằng biểu đồ**, không cần tính lại.

---

## 2. Thư viện sử dụng

Dùng `chart.js` + `react-chartjs-2` (đây là 2 gói đã từng có trong dự án, cần cài lại):

```bash
cd web-client
npm install chart.js react-chartjs-2
```

---

## 3. Dữ liệu có sẵn (không cần tính lại)

Trong [`ActivityLog.jsx`](../../web-client/src/components/ActivityLog.jsx) đã có sẵn 2 biến bạn cần:

```js
// stats: mảng 6 phần tử, mỗi phần tử = { name, field, totalMinutes }
const stats = data?.feeds ? lights.map(light => ({
  ...light,
  totalMinutes: calculateLightUsage(data.feeds, light.field)
})) : [];

// totalAllLights: tổng thời gian (phút) của cả 6 đèn
const totalAllLights = stats.reduce((sum, stat) => sum + stat.totalMinutes, 0);
```

→ Bạn sẽ truyền `stats` và `totalAllLights` vào component biểu đồ mới.

---

## 4. Các bước thực hiện

### Bước 1 — Tạo component biểu đồ mới

Tạo file mới `web-client/src/components/UsageChart.jsx`. Gợi ý khung:

```jsx
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend
} from 'chart.js';

// Đăng ký các thành phần Chart.js cần dùng (bắt buộc với chart.js v4)
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function UsageChart({ stats, totalAllLights }) {
  if (!stats?.length || totalAllLights === 0) {
    return <p>Chưa đủ dữ liệu để vẽ biểu đồ.</p>;
  }

  const labels = stats.map(s => s.name);
  const minutes = stats.map(s => Math.round(s.totalMinutes));

  const barData = {
    labels,
    datasets: [{
      label: 'Thời gian sử dụng (phút)',
      data: minutes,
      backgroundColor: '#4f9cff',
    }],
  };

  const pieData = {
    labels,
    datasets: [{
      data: minutes,
      backgroundColor: ['#4f9cff', '#ffb44f', '#4fffa3', '#ff6b6b', '#b76bff', '#6bffef'],
    }],
  };

  return (
    <div className="usage-chart">
      <div style={{ maxWidth: 600 }}>
        <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
      </div>
      <div style={{ maxWidth: 360, marginTop: 24 }}>
        <Doughnut data={pieData} options={{ responsive: true }} />
      </div>
    </div>
  );
}

export default UsageChart;
```

### Bước 2 — Nhúng vào ActivityLog

Trong [`ActivityLog.jsx`](../../web-client/src/components/ActivityLog.jsx), thêm import ở đầu file:

```js
import UsageChart from './UsageChart';
```

Rồi đặt component **ngay trên bảng `<table className="usage-table">`** (trong khối `data.feeds?.length > 0`):

```jsx
<UsageChart stats={stats} totalAllLights={totalAllLights} />

<table className="usage-table">
  ...
```

> ⚠️ Đây là **dòng import + 1 dòng JSX duy nhất** bạn thêm vào file chung `ActivityLog.jsx`. Toàn bộ logic biểu đồ nằm trong file mới `UsageChart.jsx` của bạn → hạn chế tối đa xung đột với người B.

### Bước 3 — (tùy chọn) Style cho đẹp

Thêm class `.usage-chart` vào [`web-client/src/index.css`](../../web-client/src/index.css) hoặc `App.css` để canh giữa/bo góc nền biểu đồ.

---

## 5. Ranh giới code (tránh đụng người B)

| Được sửa/tạo | KHÔNG đụng |
|---|---|
| ✅ Tạo mới `components/UsageChart.jsx` | ❌ `utils/export.js`, `components/ExportBar.jsx` (của B) |
| ✅ Thêm 1 import + 1 dòng JSX vào `ActivityLog.jsx` | ❌ Phần logic fetch/tính toán trong `ActivityLog.jsx` |
| ✅ Thêm class CSS mới | ❌ Sửa các class CSS có sẵn |

---

## 6. Kiểm tra hoàn thành

```bash
cd web-client
npm run test:run   # 81 test cũ vẫn xanh
npm run dev        # mở localhost:5173 → tab Activity → thấy biểu đồ
```

Để có dữ liệu thật cho biểu đồ: bật/tắt vài đèn trên web trong lúc ESP32 (Wokwi) đang chạy, đợi ThingSpeak ghi log (~vài phút), rồi bấm "🔄 Làm mới" trong tab Activity.

---

## 7. Gợi ý nội dung báo cáo

- **Vấn đề**: bảng số khó so sánh trực quan → biểu đồ giúp nhận biết nhanh
- **Kỹ thuật**: giải thích cơ chế `ChartJS.register()` (chart.js v4 dùng tree-shaking, phải đăng ký thủ công từng thành phần), sự khác biệt bar vs doughnut chart
- **Screenshot**: chụp biểu đồ với dữ liệu thật
- **Khó khăn thường gặp**: quên `register()` → chart trắng; dữ liệu rỗng → cần xử lý empty state (đã có sẵn trong khung code)
- **Phát triển tiếp**: thêm biểu đồ đường (line) theo thời gian trong ngày, chọn khoảng ngày để xem
