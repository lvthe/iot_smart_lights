# IoT Smart Lights - Hệ thống Điều khiển Đèn Nhà Thông Minh

Hệ thống IoT điều khiển bóng đèn thông minh qua giao diện web, sử dụng MQTT (EMQX Serverless) để giao tiếp với ESP32 và ThingSpeak để lưu trữ dữ liệu sử dụng.

> 📋 **Xem [Phân công công việc](PHAN_CONG_CONG_VIEC.md)** - Chi tiết các module và cấu hình hệ thống

### Công nghệ sử dụng

- **MQTT Broker**: EMQX Serverless (TLS, port 8883)
- **Firmware Development**: PlatformIO (C++ for ESP32)
- **Simulation**: Wokwi (ESP32 simulator với PlatformIO support)
- **Data Logging**: ThingSpeak (thống kê thời gian sử dụng đèn)
- **Web Interface**: React 19.2.6 + Vite 8.0.12 + Tailwind CSS 4.3.0 + Paho MQTT
- **Testing**: Vitest 4.1.8 + Testing Library
- **Git Hooks**: Husky 9.1.7 + lint-staged 16.4.0
- **Linting**: ESLint 10.3.0 với React plugins
- **Protocol**: MQTT over TLS

## 🏠 Vị trí bóng đèn trong nhà

### Phòng khách (Living Room)

- **Đèn trùm** (living_main) - RGB LED
- **Đèn TV** (living_tv) - RGB LED

### Phòng ngủ (Bedroom)

- **Đèn đầu giường** (bedroom_headboard) - RGB LED
- **Đèn bàn làm việc** (bedroom_desk) - RGB LED

### Nhà bếp (Kitchen)

- **Đèn chính** (kitchen) - RGB LED

### Phòng tắm (Bathroom)

- **Đèn chính** (bathroom) - LED trắng đơn + **PIR Motion Sensor** (Auto ON/OFF)

## ⚡ Các tính năng của hệ thống

### Tính năng chung (tất cả đèn)

- ✅ **Bật/Tắt đèn** - Điều khiển on/off từng bóng đèn độc lập
- ✅ **Điều chỉnh độ sáng** - Thanh trượt brightness từ 0-100%

### Tính năng màu sắc (RGB LED)

Cho các đèn RGB: Phòng khách (2 đèn), Phòng ngủ (2 đèn), Nhà bếp

- **3 Màu sắc nhiệt độ:**
  - **Trắng lạnh** (Cold White) - `#FFFFFF` RGB(255,255,255)
  - **Trắng ấm** (Warm White) - `#FFBE78` RGB(255,190,120)
  - **Vàng ấm** (Warm Yellow) - `#FFAA00` RGB(255,170,0)

### Tính năng đặc biệt (Phòng tắm)

- **LED trắng đơn** - Không thay đổi màu sắc
- **PIR Motion Sensor** - Tự động bật/tắt khi phát hiện chuyển động
  - Tự động BẬT khi có người bước vào
  - Tự động TẮT sau 20 giây không có chuyển động
  - Linh hoạt: vẫn có thể điều khiển thủ công qua giao diện web

## 🔄 Luồng hoạt động của hệ thống

Hệ thống hoạt động theo kiến trúc pub/sub với MQTT làm trung gian:

```
┌─────────────────┐                    ┌──────────────────┐                    ┌─────────────────┐
│  Web Client     │                    │   MQTT Broker    │                    │   ESP32 Device  │
│   (React)       │                    │   (EMQX Cloud)   │                    │    (Wokwi)      │
└────────┬────────┘                    └────────┬─────────┘                    └────────┬────────┘
         │                                      │                                       │
         │  User điều khiển đèn                 │                                       │
         │  (Publish: esp32/control)            │                                       │
         │ ──────────────────────────────────>  │                                       │
         │                                      │                                       │
         │                                      │  Forward tín hiệu điều khiển          │
         │                                      │ ────────────────────────────────────> │
         │                                      │                                       │
         │                                      │                              ESP32 điều khiển LED
         │                                      │                              (Subscribe: esp32/control)
         │                                      │                                       │
         │                                      │              Gửi trạng thái lại       │
         │                                      │              (Publish: esp32/status)  │
         │                                      │ <──────────────────────────────────── │
         │                                      │                                       │
         │  Forward trạng thái thiết bị         │                                       │
         │ <──────────────────────────────────  │                                       │
         │                                      │                                       │
Cập nhật UI trạng thái đèn                      │                                       │
(Subscribe: esp32/status)                       │                                       │
         │                                      │                                       │
```

#### Message Payload (JSON)

- Control Message (Web → ESP32)

```json
{
  "light_id": "living_main",
  "state": "ON",
  "brightness": 80,
  "colorId": "cold_white"
}
```

- Status Message (ESP32 → Web)

```json
{
  "light_id": "living_main",
  "state": "ON",
  "brightness": 80,
  "colorId": "cold_white",
  "color": {
    "r": 255,
    "g": 255,
    "b": 255
  }
}
```

## 📁 Cấu trúc thư mục dự án

```
iot_smart_lights/
├── README.md                          # File này
├── .gitignore                         # Git ignore file
├── .clang-format                      # Clang-format C++ style config
├── .vscode/                           # VSCode workspace settings
├── web-client/                        # Giao diện web React (Vite + Tailwind)
│   ├── package.json                   # Dependencies và scripts
│   ├── package-lock.json              # Lock file cho dependencies
│   ├── eslint.config.js               # ESLint configuration (flat config)
│   ├── vite.config.js                 # Vite configuration với @ alias
│   ├── tailwind.config.js             # Tailwind CSS configuration
│   ├── postcss.config.js              # PostCSS configuration
│   ├── jsconfig.json                  # JavaScript config cho IDE support (@ alias)
│   ├── index.html                     # HTML entry point
│   ├── .env.example                   # Mẫu file environment variables
│   ├── .env                           # Environment variables (không commit)
│   ├── .husky/                        # Git hooks (Husky)
│   │   └── pre-commit                 # Pre-commit hook cho lint-staged
│   ├── public/                        # Static assets
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── dist/                          # Build output (production)
│   └── src/
│       ├── main.jsx                   # React entry point
│       ├── App.jsx                    # Main App component
│       ├── index.css                  # Global styles (Tailwind directives)
│       ├── App.css                    # App-specific styles
│       ├── configs/
│       │   ├── mqtt.config.js         # MQTT configuration (broker, port, credentials)
│       │   └── thingspeak.config.js  # ThingSpeak configuration (channel, API keys)
│       ├── context/
│       │   ├── MQTTContext.jsx        # MQTT Context Provider (Paho MQTT)
│       │   └── ToastContext.jsx       # Toast notification system
│       ├── components/
│       │   ├── Header.jsx             # Header component with mode badge
│       │   ├── MainTabNav.jsx         # Main navigation (Control/Activity tabs)
│       │   ├── GlobalToggle.jsx       # Global controls section
│       │   ├── RoomTabs.jsx           # Room tabs navigation
│       │   ├── RoomSection.jsx        # Room display section
│       │   ├── LightCard.jsx          # Individual light card
│       │   ├── LogsSection.jsx        # MQTT logs display with filters
│       │   ├── ActivityLog.jsx        # ThingSpeak statistics & charts
│       │   └── GlobalLoading.jsx      # Loading overlay component
│       ├── utils/
│       │   ├── constants.js           # Global constants (COLOR_ID, timeouts, defaults)
│       │   ├── data.js                # Device & Room config (DEVICES, ROOMS arrays)
│       │   ├── helpers.js             # Helper utilities (color, time, calculations)
│       │   └── topics.js              # MQTT topic definitions (control, status)
│       └── __tests__/
│           ├── setup.js                # Vitest setup file (jsdom environment)
│           ├── components/
│           │   ├── LightCard.test.jsx  # LightCard component tests
│           │   └── RoomSection.test.jsx # RoomSection component tests
│           ├── context/
│           │   └── MQTTContext.test.jsx # MQTT Context tests
│           └── utils/
│               ├── topics.test.js       # Topic utility tests
│               └── mqtt.config.test.js # MQTT config tests
├── wokwi/                             # PlatformIO project cho ESP32
│   ├── platformio.ini                 # PlatformIO configuration (libs, build flags)
│   ├── wokwi.toml                     # Wokwi simulation config
│   ├── diagram.json                   # Wokwi wiring diagram JSON
│   ├── libraries.txt                  # Libraries list (Arduino)
│   ├── Library_Manager.txt            # Library Manager info
│   ├── README_WOKWI.md           # PlatformIO documentation
│   ├── .vscode/                       # VSCode IntelliSense configs
│   ├── .pio/                          # PlatformIO build output & libdeps
│   ├── lib/                           # Local libraries (nếu có)
│   ├── test/                          # PlatformIO test files (nếu có)
│   ├── include/
│   │   ├── secrets.h                  # MQTT/ThingSpeak credentials thật (không commit)
│   │   └── secrets.h.example          # Mẫu file credentials
│   └── src/
│       └── main.cpp                   # ESP32 firmware (C++)
```

## 🔧 Thiết lập môi trường

Thông tin kết nối EMQX Serverless và ThingSpeak được lưu trong file `.env` (web client) và `secrets.h` (firmware):

⚠️ **Lưu ý**: Cả hai file đều chứa sensitive information, đã được thêm vào `.gitignore`. Không commit các file này lên git.

1. Copy file mẫu thành file thật:

   ```bash
   cd web-client
   cp .env.example .env

   cd ../wokwi/include
   cp secrets.h.example secrets.h
   ```

2. Điền thông tin credentials theo hướng dẫn trong các phần dưới đây:
   - **EMQX**: Xem "Thiết lập EMQX Serverless"
   - **ThingSpeak**: Xem "Thiết lập ThingSpeak"

### Thiết lập EMQX Serverless

1. **Tạo EMQX Serverless Deployment:**
   - Truy cập [EMQX Cloud](https://www.emqx.com/en/cloud)
   - Đăng ký tài khoản miễn phí (Free tier: 100 connections/day)
   - Tạo deployment mới với tên bất kỳ (e.g., `iot-smart-lights`)
   - Chọn region gần bạn (Asia Southeast Singapore cho Việt Nam)
   - Deployment sẽ được tạo với dạng URL: `bxxxxxxx.ala.asia-southeast1.emqxsl.com`

2. **Lấy thông tin kết nối:**
   - Vào deployment → **Overview** → **Connection Info**
   - Copy các thông tin sau
   * file `.env` ở web client

   ```bash
   # MQTT Configuration từ EMQX Cloud
   VITE_MQTT_BROKER=bxxxxxxx.ala.asia-southeast1.emqxsl.com  # Your broker address
   VITE_MQTT_PORT=8883                                       # TLS port
   VITE_MQTT_USERNAME=your_username                          # Username từ EMQX
   VITE_MQTT_PASSWORD=your_password                          # Password từ EMQX
   ```

   - file `wokwi/include/secrets.h`:

   ```bash
    const char *MQTT_BROKER = "b280221b.ala.asia-southeast1.emqxsl.com";
    const int MQTT_PORT = 8883;
    const char *MQTT_USER = "wokwi_device";
    const char *MQTT_PASSWORD = "LFHazFmDRUftex7";
   ```

3. **Tạo Authentication:**
   - Vào deployment → **Authentication** → **Username/Password**
   - Tạo 2 users:
     - `wokwi_device` - cho ESP32 device <- Đây là thông tin điền vào `MQTT_USER` và `MQTT_PASSWORD` ở wokwi
     - `web_client` - cho web client <- Đây là thông tin điền vào `VITE_MQTT_USERNAME` và `VITE_MQTT_PASSWORD` ở web client

4. **Cấu hình Authorization cho 2 user vừa tạo ở trên**
   - Vào mục **Authentication** → chọn tab **Username**
   - Cho phép publish/subscribe theo username:
     - wokwi_device:
       - Topic: `esp32/status`, Action: `Publish`, Permission: `Allow`
       - Topic: `esp32/control`, Action: `Subscribe`, Permission: `Allow`
     - web_client:
       - Topic: `esp32/status`, Action: `Subscribe`, Permission: `Allow`
       - Topic: `esp32/control`, Action: `Publish`, Permission: `Allow`

### Thiết lập ThingSpeak

1. **Tạo ThingSpeak Channel:**
   - Truy cập [thingspeak.com](https://thingspeak.com) và đăng ký
   - Tạo Channel mới với 6 Fields cho 6 đèn

2. **Cấu hình Fields:**
   - Field 1: `living_main` - Đèn trùm
   - Field 2: `living_tv` - TV Area
   - Field 3: `bedroom_headboard` - Đèn đầu giường
   - Field 4: `bedroom_desk` - Đèn bàn làm việc
   - Field 5: `kitchen` - Đèn nhà bếp
   - Field 6: `bathroom` - Đèn phòng tắm

3. **Lấy thông tin kết nối:**
   - Vào Channel → **API Keys** tab
   - Copy các thông tin sau:
   * file `.env` ở web client:

   ```bash
   # ThingSpeak Configuration
   VITE_THINGSPEAK_CHANNEL_ID=3407942                # Your Channel ID
   VITE_THINGSPEAK_READ_API_KEY=your_read_api_key    # Read API Key từ ThingSpeak
   ```

   - file `wokwi/include/secrets.h` (ESP32):

   ```ini
   #define THINGSPEAK_CHANNEL_ID 3407942
   #define THINGSPEAK_WRITE_API_KEY "09SXDCYSQ7GPP84K"
   ```

4. **Fields Mapping:**

   | Field | Light ID            | Giá trị         |
   | ----- | ------------------- | --------------- |
   | 1     | `living_main`       | 0 = OFF, 1 = ON |
   | 2     | `living_tv`         | 0 = OFF, 1 = ON |
   | 3     | `bedroom_headboard` | 0 = OFF, 1 = ON |
   | 4     | `bedroom_desk`      | 0 = OFF, 1 = ON |
   | 5     | `kitchen`           | 0 = OFF, 1 = ON |
   | 6     | `bathroom`          | 0 = OFF, 1 = ON |

5. **ESP32 Upload Logic:**
   - Check interval: 60 giây
   - Upload khi có **THAY ĐỔI trạng thái** (ON → OFF hoặc OFF → ON)
   - Method: `ThingSpeak.writeFields()` gửi cả 6 field cùng lúc
   - Code location: `wokwi/src/main.cpp`

## 💻 Cài đặt và chạy

### Yêu cầu

- Node.js 18+ và npm/pnpm
- PlatformIO CLI (cho ESP32 development)
- Trình duyệt web hiện đại (Chrome, Firefox, Edge)
- Kết nối internet cho EMQX và ThingSpeak
- Tài khoản Wokwi (cho simulation)

### Chạy giao diện web (`web-client/`)

**Cài đặt dependencies:**

```bash
cd web-client
npm install
```

**Chạy development server:**

```bash
npm run dev
```

### Phát triển ESP32 với PlatformIO (`wokwi/`)

**Cài đặt PlatformIO:**

```bash
pip install platformio
```

**Build firmware:**

```bash
cd wokwi
pio run
```

**Upload đến Wokwi:**

```bash
# Wokwi sẽ tự động nạp firmware từ .pio/build/wokwi/firmware.bin
# Khi simulation start
```

**Monitor Serial:**

```bash
pio device monitor
```

> 📖 **Xem thêm:** Hardware configuration, GPIO pin mapping, và schematic trong [wokwi/README_WOKWI.md](wokwi/README_WOKWI.md#hardware-configuration-wokwi)

## 🌐 Web Wokwi Setup

Để chạy simulation trên web Wokwi (không qua VSCode):

1. Truy cập [wokwi.com](https://wokwi.com) và tạo project ESP32 mới
2. Tạo file `sketch.ino` và copy code từ [`wokwi/src/main.cpp`](wokwi/src/main.cpp)
3. Copy nội dung [`wokwi/diagram.json`](wokwi/diagram.json) paste vào Diagram Editor
4. Cài libraries manual trong wokwi.com (xem danh sách trong [`wokwi/libraries.txt`](wokwi/libraries.txt)): PubSubClient, ArduinoJson, ThingSpeak
5. Build và Run simulation

> 📖 **Xem thêm:** Chi tiết về PlatformIO development trong [wokwi/README_WOKWI.md](wokwi/README_WOKWI.md)
