# [Người D] Tính năng: Lịch hẹn giờ tự bật/tắt đèn

> **Mảng:** Firmware/Wokwi · **Nhánh git:** `feature/schedule`
> **Độ khó:** Trung bình–Khó (logic thời gian) · **Ước lượng:** 2 buổi

---

## 1. Mục tiêu

Cho phép đặt **lịch tự động bật/tắt đèn theo giờ trong ngày** (VD: 18:00 bật đèn phòng khách, 23:00 tắt). ESP32 tự kiểm tra giờ hiện tại (đã có sẵn NTP) và thực hiện lệnh mà không cần người bấm.

Đây là tính năng "hẹn giờ" kinh điển của smart home, tận dụng **đồng bộ thời gian NTP đã có sẵn** trong firmware.

---

## 2. Nền tảng có sẵn (tận dụng, không làm lại)

Firmware **đã đồng bộ giờ thực qua NTP** trong `setupWiFi()`:

```cpp
configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER1, NTP_SERVER2);
```

Và đã có hàm lấy giờ trong [`main.cpp`](../../wokwi/src/main.cpp) — bạn dùng `time()` / `localtime_r()` giống như hàm `nowStamp()` đang có để lấy giờ:phút hiện tại.

Bạn cũng sẽ tái sử dụng các hàm có sẵn: `setPower()`, `updateRGBLED()`, và cơ chế `pendingStatusPublish[]` để báo trạng thái mới lên web.

---

## 3. Phần mềm — thêm vào `main.cpp`

### Bước 1 — Khai báo cấu trúc lịch (sau cụm khai báo của người C)

```cpp
// ==================== Schedule (Hẹn giờ) ====================
struct Schedule {
  int roomIndex; // đèn nào (0..5)
  int onHour, onMinute;   // giờ bật
  int offHour, offMinute; // giờ tắt
  bool enabled;
};

// Ví dụ: đèn phòng khách (index 0) bật 18:00, tắt 23:00
Schedule schedules[] = {
  { 0, 18, 0, 23, 0, true },   // living_main
  { 4, 17, 30, 22, 0, true },  // kitchen
};
const int SCHEDULE_COUNT = sizeof(schedules) / sizeof(schedules[0]);

// Kiểm tra mỗi 30s để không bỏ lỡ mốc phút
const unsigned long SCHEDULE_CHECK_INTERVAL = 30000;
unsigned long lastScheduleCheck = 0;

// Nhớ phút đã xử lý gần nhất để không kích hoạt lặp lại trong cùng 1 phút
int lastHandledMinute = -1;
```

### Bước 2 — Hàm kiểm tra & thực thi lịch

Thêm hàm này (đặt gần các hàm helper khác, VD trước `setup()`):

```cpp
void checkSchedules() {
  time_t now = time(nullptr);
  if (now < 100000) return; // NTP chưa sync xong -> chưa có giờ thực, bỏ qua

  struct tm t;
  localtime_r(&now, &t);
  int curH = t.tm_hour;
  int curM = t.tm_min;

  // Chỉ xử lý 1 lần mỗi phút (tránh bật/tắt lặp trong cùng phút)
  if (curM == lastHandledMinute) return;
  lastHandledMinute = curM;

  for (int i = 0; i < SCHEDULE_COUNT; i++) {
    Schedule &s = schedules[i];
    if (!s.enabled) continue;

    // Đến giờ BẬT
    if (curH == s.onHour && curM == s.onMinute && !rgbStates[s.roomIndex].power) {
      setPower(s.roomIndex, true);
      updateRGBLED(s.roomIndex);
      pendingStatusPublish[s.roomIndex] = true; // báo web
      LOG("[SCHEDULE] Auto ON " + String(ROOM_NAMES[s.roomIndex]) +
          " luc " + String(curH) + ":" + String(curM));
    }

    // Đến giờ TẮT
    if (curH == s.offHour && curM == s.offMinute && rgbStates[s.roomIndex].power) {
      setPower(s.roomIndex, false);
      updateRGBLED(s.roomIndex);
      pendingStatusPublish[s.roomIndex] = true;
      LOG("[SCHEDULE] Auto OFF " + String(ROOM_NAMES[s.roomIndex]) +
          " luc " + String(curH) + ":" + String(curM));
    }
  }
}
```

> ⚠️ Nhớ khai báo `void checkSchedules();` ở cụm **Function Declarations** đầu file cho khớp phong cách code hiện tại.

### Bước 3 — Gọi trong `loop()`

Thêm khối này vào `loop()` (đặt gần khối ThingSpeak/DHT, trước `delay(LOOP_DELAY_MS)`):

```cpp
// ===== Kiểm tra lịch hẹn giờ (mỗi 30s) =====
if (millis() - lastScheduleCheck >= SCHEDULE_CHECK_INTERVAL) {
  lastScheduleCheck = millis();
  checkSchedules();
}
```

---

## 4. Cách test nhanh trong Wokwi (quan trọng)

Chờ tới 18:00 thật để xem đèn bật thì rất lâu. Có 2 cách test nhanh:

- **Cách 1 (khuyên dùng):** Sửa tạm giờ trong `schedules[]` thành **1–2 phút sau giờ hiện tại** (xem log `nowStamp()` để biết giờ ESP32 đang là mấy giờ), build lại, chờ tới mốc đó xem đèn tự bật.
- **Cách 2:** Tạm giảm điều kiện — cho bật khi `curM % 2 == 0` để thấy hiệu ứng nhanh (nhớ đổi lại trước khi nộp).

> 💡 Giờ NTP trong Wokwi theo UTC+7 (đã cấu hình `GMT_OFFSET_SEC = 7*3600`). Xem log `[hh:mm:ss]` đầu mỗi dòng để biết giờ hiện tại của ESP32.

---

## 5. Ranh giới code (tránh đụng người C)

`main.cpp` là file chung với người C (DHT22). Chia rõ:

| Bạn (D) — Scheduler | Người C — DHT22 |
|---|---|
| ✅ Khai báo `Schedule`/`schedules[]` ở **cuối** cụm khai báo | ✅ Khai báo DHT ở cuối cụm |
| ✅ Thêm hàm `checkSchedules()` mới | ✅ Thêm khối đọc DHT trong loop |
| ✅ Thêm khối "Kiểm tra lịch" trong `loop()` | ✅ Sửa `platformio.ini` (bạn không cần) |
| ❌ Không sửa `platformio.ini`, `diagram.json` | ✅ Sửa `diagram.json` |

→ Bạn **không cần thêm thư viện hay linh kiện** — chỉ dùng NTP + hàm có sẵn. Hai người thêm khối code riêng biệt trong `loop()`.

---

## 6. (Tùy chọn — mở rộng) Đặt lịch từ web qua MQTT

Nâng cao: cho phép web gửi lịch qua topic `esp32/control` với 1 dạng payload mới (VD `{"action":"set_schedule",...}`), ESP32 parse và cập nhật mảng `schedules[]` lúc chạy (thay vì hardcode). Đây là phần cộng điểm, cần phối hợp với người làm web.

---

## 7. Kiểm tra hoàn thành

1. Build PlatformIO (`Ctrl+Alt+B`) → `[SUCCESS]`
2. Đặt lịch test 1–2 phút sau giờ hiện tại (xem mục 4)
3. Chạy simulation, chờ tới mốc giờ → thấy log:
   ```
   [SCHEDULE] Auto ON Đèn trùm luc 18:0
   ```
   và đèn tương ứng trong mạch **tự sáng lên**
4. Kiểm tra web (nếu chạy song song) cũng cập nhật trạng thái đèn đó sang ON
5. Xác nhận đèn/PIR/điều khiển tay cũ **vẫn hoạt động bình thường**

---

## 8. Gợi ý nội dung báo cáo

- **Vấn đề**: người dùng muốn đèn tự bật/tắt theo thói quen sinh hoạt mà không phải bấm tay mỗi ngày
- **Kỹ thuật**: giải thích cách lấy giờ thực từ NTP, cấu trúc `struct tm`, tại sao cần cờ `lastHandledMinute` (tránh kích hoạt lặp lại nhiều lần trong cùng 1 phút do `loop()` chạy nhiều lần/phút)
- **Demo**: log `[SCHEDULE]` + đèn tự bật đúng giờ
- **Khó khăn**: xử lý múi giờ (UTC+7); tránh bật/tắt lặp; test nhanh không phải chờ giờ thật
- **Phát triển tiếp**: đặt lịch động từ web thay vì hardcode, lịch theo thứ trong tuần, lưu lịch vào bộ nhớ flash (NVS) để không mất khi restart
