# Phân công công việc - IoT Smart Lights

> [← Quay lại README](README.md)

Tài liệu này phân chia các nhiệm vụ phát triển theo 3 thành phần chính của hệ thống.

---

## 1. Cấu hình MQTT và ThingSpeak

Phần này liệt kê các bước cấu hình trên web. Cấu hình trong source code đã được phân công ở phần 2 và 3.

### 1.1 Cấu hình EMQX Serverless

**Bước 1: Tạo EMQX Serverless Deployment**
1. Truy cập [EMQX Cloud](https://www.emqx.com/en/cloud)
2. Đăng ký tài khoản miễn phí (Free tier: 100 connections/day)
3. Tạo deployment mới với tên bất kỳ (e.g., `iot-smart-lights`)
4. Chọn region gần bạn (Asia Southeast Singapore cho Việt Nam)
5. Deployment sẽ được tạo với dạng URL: `bxxxxxxx.ala.asia-southeast1.emqxsl.com`

**Bước 2: Lấy thông tin kết nối**
1. Vào deployment → **Overview** → **Connection Info**
2. Copy các thông tin sau:
   - Broker address
   - Port (8883 cho TLS)

**Bước 3: Tạo Authentication**
1. Vào deployment → **Authentication** → **Username/Password** → **Create**
2. Tạo 2 users:
   - `wokwi_device` - cho ESP32 device
   - `web_client` - cho web client

**Bước 4: Cấu hình Authorization**
1. Vào **Authentication** → tab **Username**
2. Cấu hình ACL cho từng user:

| User | Topic | Action | Permission |
|------|-------|--------|------------|
| `wokwi_device` | `esp32/status` | Publish | Allow |
| `wokwi_device` | `esp32/control` | Subscribe | Allow |
| `web_client` | `esp32/control` | Publish | Allow |
| `web_client` | `esp32/status` | Subscribe | Allow |

**Thông số cần lưu:**
- **Broker URL:** `bxxxxxxx.ala.asia-southeast1.emqxsl.com`
- **Port:** 8883 (TLS)
- **Protocol:** MQTT over WebSocket Secure (WSS)

### 1.2 Cấu hình ThingSpeak

**Bước 1: Tạo ThingSpeak Channel**
1. Truy cập [thingspeak.com](https://thingspeak.com) và đăng ký
2. Chọn **Channels** → **New Channel**
3. Nhập tên channel (e.g., "IoT Smart Lights")
4. Tạo 6 Fields:

| Field | Name | Light ID |
|-------|------|----------|
| Field 1 | `living_main` | Đèn trùm |
| Field 2 | `living_tv` | TV Area |
| Field 3 | `bedroom_headboard` | Đèn đầu giường |
| Field 4 | `bedroom_desk` | Đèn bàn làm việc |
| Field 5 | `kitchen` | Đèn nhà bếp |
| Field 6 | `bathroom` | Đèn phòng tắm |

**Bước 2: Lấy thông tin kết nối**
1. Vào Channel → **API Keys** tab
2. Copy các thông tin sau:
   - **Channel ID**
   - **Write API Key** (cho ESP32)
   - **Read API Key** (cho Web Client)

**Bước 3: Fields Mapping**
Giá trị upload: `0 = OFF`, `1 = ON`

**Bước 4: Cấu hình Update Rate**
1. Vào **Channel Settings** → **Channel Info**
2. Chọn update rate phù hợp (không quá nhanh để tránh rate limit)
3. ESP32 sẽ upload mỗi 60s khi có thay đổi trạng thái

---

## 2. Giao diện web điều khiển (Web Client)

**Thư mục:** `web-client/`

### 2.1 Cấu trúc Components

**Main Components (`src/components/`):**

| Component | Chức năng |
|-----------|-----------|
| `Header.jsx` | Header với mode badge (dev/production) |
| `MainTabNav.jsx` | Navigation chính (Control/Activity tabs) |
| `GlobalToggle.jsx` | Global controls (bật/tắt tất cả đèn) |
| `RoomTabs.jsx` | Room tabs navigation |
| `RoomSection.jsx` | Hiển thị section theo phòng |
| `LightCard.jsx` | Card điều khiển từng đèn |
| `LogsSection.jsx` | Hiển thị MQTT logs với filter |
| `ActivityLog.jsx` | Thống kê sử dụng từ ThingSpeak |
| `GlobalLoading.jsx` | Loading overlay |

### 2.2 Tính năng hiện có

**MQTT Context (`src/context/MQTTContext.jsx`):**
- Kết nối đến EMQX broker qua WebSocket Secure (WSS)
- Subscribe topic `esp32/status` để nhận trạng thái thiết bị
- Publish topic `esp32/control` để gửi lệnh điều khiển
- Auto-reconnect khi mất kết nối
- Device timeout detection (40s)
- Pending state tracking khi chờ phản hồi từ ESP32
- MQTT message logging (100 messages max)

**LightCard Features:**
- Bật/tắt đèn (power toggle)
- Điều chỉnh độ sáng (0-100%) với debounce 300ms
- Chọn màu sắc (cho RGB LED):
  - Trắng Lạnh (Cold White) - `#FFFFFF`
  - Trắng Ấm (Warm White) - `#FFBE78`
  - Vàng Ấm (Warm Yellow) - `#FFAA00`
- Hiển thị trạng thái kết nối thiết bị (online/offline)
- Glow effect cho đèn đang bật

**LogsSection Features:**
- Hiển thị MQTT message logs dạng bảng
- Filter theo loại message (control, status, system)
- Xóa logs / Tạm dừng auto-scroll
- Hiển thị trạng thái kết nối broker và thiết bị
- Time stamp cho mỗi message

**ActivityLog Features:**
- Fetch dữ liệu từ ThingSpeak API
- Tính tổng thời gian sử dụng cho mỗi đèn
- Hiển thị biểu đồ phần trăm sử dụng
- Format thời gian (hours, minutes, seconds)
- Refresh button để tải lại dữ liệu
- Hiển thị thời gian cập nhật cuối cùng

### 2.3 Constants & Utilities

**`src/utils/constants.js`:**
- Color ID constants (COLD_WHITE, WARM_WHITE, WARM_YELLOW)
- Default brightness: 100%
- Timeout values (MQTT response, device heartbeat)
- Debounce delay: 300ms

**`src/utils/data.js`:**
- `DEVICES` object: Cấu hình 6 đèn với thông tin:
  - `id`, `name`, `type` (rgb/single), `field_thingspeak`, `room_key`
- `ROOMS` object: Cấu hình 4 phòng với icon

**`src/utils/topics.js`:**
- Topic definitions (control, status)

**`src/utils/helpers.js`:**
- Color utilities (getColorById, findColorByRGB)
- Time formatting (formatTime, calculateLightUsage)
- Device utilities (getDeviceIds, isRGBDevice)

---

## 3. Thiết bị ESP32 (Wokwi Simulation)

**Thư mục:** `wokwi/`

### 3.1 PlatformIO Configuration

**File:** `platformio.ini`

```ini
[env:wokwi]
platform = espressif32
board = esp32dev
framework = arduino
monitor_speed = 115200
monitor_filters = esp32_exception_decoder
build_flags =
    -DCORE_DEBUG_LEVEL=3
    -DBOARD_HAS_PSRAM
    -DWOKWI_SIMULATION
lib_deps =
    bblanchon/ArduinoJson@^7.2.2
    knolleary/PubSubClient@^2.8
    mathworks/ThingSpeak@^2.1.1
```

**Libraries:**
- **ArduinoJson** 7.2.2 - Parse MQTT messages
- **PubSubClient** 2.8 - MQTT client
- **ThingSpeak** 2.1.1 - Data logging

### 3.2 Pin Configuration (GPIO)

| Thiết bị | R (Red) | G (Green) | B (Blue) | Loại |
|----------|---------|-----------|----------|------|
| Living Room Main | GPIO 25 | GPIO 13 | GPIO 26 | RGB |
| TV Area | GPIO 4 | GPIO 17 | GPIO 16 | RGB |
| Bed Headboard | GPIO 23 | GPIO 22 | GPIO 21 | RGB |
| Bed Desk | GPIO 19 | GPIO 18 | GPIO 5 | RGB |
| Kitchen | GPIO 27 | GPIO 32 | GPIO 14 | RGB |
| Bathroom | GPIO 33 | - | - | LED đơn |
| PIR Sensor (Bathroom) | GPIO 35 (input) | - | - | Motion |

**Resistors:** 220Ω cho tất cả LED channels

### 3.3 Tính năng ESP32 Firmware

**WiFi & Network:**
- Kết nối WiFi: `Wokwi-GUEST`
- NTP time sync (UTC+7)
- Auto-reconnect với timeout 30s

**MQTT Communication:**
- Single connection architecture:
  - Subscribe `esp32/control`
  - Publish `esp32/status`
- TLS/SSL connection (port 8883)
- JSON message parsing
- Deferred publish (tránh reentrancy crash)
- Status broadcast every 30s

**LED Control:**
- PWM brightness control (0-100%)
- RGB color mixing (3 màu nhiệt độ)
- Common cathode RGB LEDs
- AnalogWrite cho Wokwi compatibility

**PIR Motion Sensor (Bathroom):**
- Auto ON khi phát hiện chuyển động
- Auto OFF sau 20s không có motion
- Manual override khi web bật/tắt
- Countdown logging mỗi 5s

**ThingSpeak Logging:**
- Upload every 60s
- Chỉ upload khi có thay đổi trạng thái
- Gửi cả 6 field cùng lúc
- Response logging (200 OK / Failed)

**Color Palette (ESP32 là nguồn sự thật):**
```cpp
const ColorDef COLOR_PALETTE[] = {
    {"cold_white", 255, 255, 255}, // Trắng Lạnh
    {"warm_white", 255, 190, 120}, // Trắng Ấm
    {"warm_yellow", 255, 170, 0}   // Vàng Ấm
};
```

### 3.4 Wokwi Diagram

**File:** `wokwi/diagram.json`

**Components:**
- 1x ESP32 DevKit-C v4
- 5x RGB LED modules (Common Cathode)
- 1x Single LED (White) cho bathroom
- 1x PIR Motion Sensor
- 17x 220Ω Resistors

**Connections:**
- Tất cả LED COM → ESP32 GND
- PIR VCC → ESP32 3V3
- PIR GND → ESP32 GND
- PIR OUT → GPIO 35

---

## Tóm tắt phân công

Dù có 2 thành viên, dự án được chia thành 3 phần rõ ràng:

1. **Backend/Firmware (ESP32)** - Phát triển firmware C++ cho ESP32, cấu hình MQTT, ThingSpeak, PIR sensor
2. **Frontend (Web Client)** - Phát triển giao diện React, MQTT integration, UI/UX, charts
3. **Integration/DevOps** - Cấu hình EMQX, ThingSpeak, môi trường development, testing

Mỗi thành phần có thể được phát triển song song nhờ kiến trúc pub/sub của MQTT.
