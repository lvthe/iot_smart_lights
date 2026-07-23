/**
 * UsageChart - Biểu đồ trực quan hóa thời gian sử dụng đèn
 * Nhận stats (đã tính sẵn trong ActivityLog) và vẽ bar chart + doughnut chart.
 */
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Chart.js v4 dùng tree-shaking: phải đăng ký thủ công từng thành phần sẽ dùng
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// Bảng màu cho 6 đèn (khớp thứ tự stats)
const CHART_COLORS = ['#4f9cff', '#ffb44f', '#4fffa3', '#ff6b6b', '#b76bff', '#6bffef'];

function UsageChart({ stats, totalAllLights }) {
  if (!stats?.length || totalAllLights === 0) {
    return (
      <div className="usage-chart-empty">
        <p>Chưa đủ dữ liệu để vẽ biểu đồ. Hãy bật/tắt đèn để ThingSpeak ghi log.</p>
      </div>
    );
  }

  const labels = stats.map(s => s.name);
  const minutes = stats.map(s => Math.round(s.totalMinutes));

  const barData = {
    labels,
    datasets: [
      {
        label: 'Thời gian sử dụng (phút)',
        data: minutes,
        backgroundColor: CHART_COLORS,
        borderRadius: 6
      }
    ]
  };

  const doughnutData = {
    labels,
    datasets: [
      {
        data: minutes,
        backgroundColor: CHART_COLORS,
        borderWidth: 1
      }
    ]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Thời gian sử dụng theo đèn (phút)' }
    },
    scales: {
      y: { beginAtZero: true }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      title: { display: true, text: 'Tỷ lệ sử dụng giữa các đèn' }
    }
  };

  return (
    <div className="usage-chart">
      <div className="usage-chart-box">
        <Bar data={barData} options={barOptions} />
      </div>
      <div className="usage-chart-box usage-chart-doughnut">
        <Doughnut data={doughnutData} options={doughnutOptions} />
      </div>
    </div>
  );
}

export default UsageChart;
