# [Người C] Tính năng: Cảm biến nhiệt độ – độ ẩm DHT22

> **Mảng:** Firmware/Wokwi · **Nhánh git:** `feature/dht22`
> **Độ khó:** Trung bình–Khó (đụng cả phần cứng + firmware) · **Ước lượng:** 2 buổi

---

## 1. Mục tiêu

Thêm cảm biến **DHT22** (đo nhiệt độ & độ ẩm) vào mạch ESP32, đọc giá trị định kỳ và **publish lên MQTT** qua một topic mới `esp32/sensor`. Dữ liệu này có thể hiển thị trên web (phần hiển thị web là tùy chọn mở rộng).

Đây là tính năng làm cho hệ thống "smart home" thật hơn — không chỉ điều khiển đèn mà còn **giám sát môi trường**.

---

## 2. Phần cứng — thêm vào `diagram.json`

DHT22 trong Wokwi có type `wokwi-dht22`. Cảm biến này có 3 chân dùng: `VCC`, `SDA` (data), `GND`.

### Bước 1 — Thêm linh kiện vào mảng `parts` của [`diagram.json`](../../wokwi/diagram.json)

Thêm object sau vào mảng `"parts"` (đặt sau linh kiện PIR cho gọn):

```json
{
  "type": "wokwi-dht22",
  "id": "dht_livingroom",
  "top": 300,
  "left": -1050,
  "attrs": { "label": "Temp/Humidity" }
}
```

### Bước 2 — Thêm dây nối vào mảng `connections`

Chọn 1 chân GPIO **chưa dùng và xuất/nhập được** cho data. Các chân RGB/PIR đã dùng: 25,13,26,4,17,16,23,22,21,19,18,5,27,32,14,33,35. **Không dùng GPIO 34–39 vì đó là chân input-only** — DHT cần giao tiếp 2 chiều. Chân **GPIO 15** còn trống và xuất/nhập được. Thêm:

```json
[ "dht_livingroom:VCC", "esp32:3V3", "red", [ "h0" ] ],
[ "dht_livingroom:GND", "esp32:GND.1", "black", [ "h0" ] ],
[ "dht_livingroom:SDA", "esp32:15", "green", [ "h0" ] ]
```

> 💡 Nếu Wokwi báo lỗi trùng chân hoặc thiếu chân GND, mở tab `diagram.json` ở chế độ **Diagram Editor** (nút bút chì) để kéo-thả dây trực quan cho dễ.

---

## 3. Phần mềm — thêm vào `main.cpp`

### Bước 1 — Thêm thư viện

Cách 1 (khuyên dùng): thêm vào [`platformio.ini`](../../wokwi/platformio.ini), mục `lib_deps`:

```ini
lib_deps =
    bblanchon/ArduinoJson@^7.2.2
    knolleary/PubSubClient@^2.8
    mathworks/ThingSpeak@^2.1.1
    adafruit/DHT sensor library@^1.4.6         ; <-- thư viện DHT của Adafruit (hợp Wokwi)
    adafruit/Adafruit Unified Sensor@^1.1.14   ; <-- dependency bắt buộc của thư viện trên
```

> ⚠️ **Lưu ý (đã kiểm chứng thực tế):** thư viện `DHTesp` (beegee-tokyo) **không đọc được** DHT22 trên Wokwi (báo `Read error: TIMEOUT` liên tục). Dùng thư viện **Adafruit DHT** như trên mới hoạt động. Adafruit DHT cần thêm gói `Adafruit Unified Sensor`.

### Bước 2 — Khai báo (đầu file `main.cpp`, sau các `#include` khác)

```cpp
#include <DHT.h>  // thư viện DHT của Adafruit

#define DHT_PIN 15
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// Timing đọc cảm biến (đọc mỗi 5 giây, không đọc quá nhanh)
const unsigned long DHT_READ_INTERVAL = 5000;
unsigned long lastDHTRead = 0;

const char *SENSOR_TOPIC = "esp32/sensor"; // topic MỚI cho dữ liệu cảm biến
```

### Bước 3 — Khởi tạo trong `setup()`

Thêm vào cuối hàm `setup()` (trước `LOG("Setup complete!")`):

```cpp
dht.begin();
LOG("DHT22 initialized on GPIO " + String(DHT_PIN));
```

### Bước 4 — Đọc & publish trong `loop()`

Thêm khối sau vào `loop()` — đặt **sau khối ThingSpeak Upload**, trước `delay(LOOP_DELAY_MS)`:

```cpp
// ===== Đọc DHT22 & publish (mỗi 5s) =====
if (millis() - lastDHTRead >= DHT_READ_INTERVAL) {
  lastDHTRead = millis();

  float temperature = dht.readTemperature(); // °C
  float humidity = dht.readHumidity();       // %

  // readTemperature/readHumidity trả về NaN nếu đọc lỗi
  if (isnan(temperature) || isnan(humidity)) {
    LOG("[DHT22] Read error (NaN)");
  } else {
    JsonDocument doc;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;

    String output;
    serializeJson(doc, output);

    if (mqtt.connected()) {
      mqtt.publish(SENSOR_TOPIC, output.c_str());
      mqtt.loop(); // xử lý gói inbound sau khi publish
    }
    LOG("[DHT22] Temp=" + String(temperature, 1) + "C Humidity=" +
        String(humidity, 1) + "% -> " + output);
  }
}
```

---

## 4. Ranh giới code (tránh đụng người D)

`main.cpp` là file chung với người D (làm scheduler). Chia rõ:

| Bạn (C) — DHT22 | Người D — Scheduler |
|---|---|
| ✅ Khai báo biến DHT ở **cuối** cụm khai báo | ✅ Khai báo biến schedule ở cuối, sau cụm của bạn |
| ✅ Thêm 1 dòng init DHT trong `setup()` | ✅ Thêm dòng init schedule riêng |
| ✅ Thêm khối "Đọc DHT22" trong `loop()` | ✅ Thêm khối "Kiểm tra schedule" trong `loop()` |
| ✅ Sửa `platformio.ini` thêm lib DHT | ⚠️ D không cần thêm lib |

→ Hai người thêm **khối code riêng, không chồng lên nhau**. Hẹn 1 người merge cuối, hoặc pull code người kia về trước khi thêm phần mình.

---

## 5. (Tùy chọn — mở rộng) Hiển thị trên web

Nếu muốn dữ liệu hiện trên web, phối hợp với người làm web: subscribe thêm topic `esp32/sensor` trong [`MQTTContext.jsx`](../../web-client/src/context/MQTTContext.jsx) và hiển thị nhiệt độ/độ ẩm ở Header. Đây là phần cộng điểm, không bắt buộc.

---

## 6. Kiểm tra hoàn thành

1. Build PlatformIO (`Ctrl+Alt+B`) → `[SUCCESS]`
2. Chạy simulation Wokwi
3. Xem log Serial thấy dòng lặp mỗi 5s:
   ```
   [DHT22] Temp=24.0C Humidity=40.0% -> {"temperature":24,"humidity":40}
   ```
4. Trong Wokwi, **click vào cảm biến DHT22** khi đang chạy → hiện thanh trượt cho phép chỉnh nhiệt độ/độ ẩm giả lập → xem giá trị trong log thay đổi theo
5. Xác nhận đèn/PIR cũ **vẫn hoạt động bình thường** (không làm hỏng tính năng cũ)

---

## 7. Gợi ý nội dung báo cáo

- **Vấn đề**: hệ thống mới chỉ điều khiển đèn, chưa giám sát môi trường → thêm cảm biến
- **Phần cứng**: giải thích DHT22 là gì, nguyên lý (đo điện dung để tính độ ẩm, đo nhiệt điện trở để tính nhiệt độ), tại sao chọn GPIO 15 (chưa dùng, xuất/nhập được — không dùng được GPIO 34–39 vì input-only mà DHT cần giao tiếp 2 chiều)
- **Phần mềm**: giải thích tại sao đọc mỗi 5s (DHT22 có tần số lấy mẫu tối đa ~0.5Hz, không đọc quá nhanh), cơ chế topic MQTT mới `esp32/sensor`
- **Demo**: log Serial + ảnh mạch có cảm biến, thao tác chỉnh giá trị giả lập trong Wokwi
- **Khó khăn**: chọn chân GPIO không trùng; xử lý lỗi đọc cảm biến (`getStatus()`)
- **Phát triển tiếp**: đẩy nhiệt độ/độ ẩm lên ThingSpeak (thêm field 7, 8), cảnh báo khi vượt ngưỡng
