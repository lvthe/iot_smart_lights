# IoT Smart Lights - Wokwi Hardware & PlatformIO

> **PlatformIO development guide và Hardware configuration cho ESP32 firmware.**
>
> Xem [README.md](../README.md) cho tổng quan dự án, cấu hình MQTT ThingSpeak, và giao diện web.

## 🛠️ Cài đặt PlatformIO

### Trong VSCode:

1. Cài extension "PlatformIO IDE"
2. Mở Command Palette (`Ctrl+Shift+P`)
3. Chọn "PlatformIO: Build" hoặc "PlatformIO: Upload"

### Command line:

```bash
# Cài đặt PlatformIO core (nếu chưa có)
pip install platformio

# Hoặc cài via homebrew (macOS)
brew install platformio
```

## ⚡ Workflow phát triển

### Workflow chuẩn với Wokwi:

| Step | Hành động      | Command                         |
| :--: | -------------- | ------------------------------- |
|  1   | Sửa code       | Edit `src/main.cpp`             |
|  2   | Save           | `Ctrl+S`                        |
|  3   | **Build** ⭐   | `pio run` hoặc click 🔨 "Build" |
|  4   | Run Simulation | Click "Run Wokwi Simulation"    |

⚠️ **QUAN TRỌNG:** Vì project có `platformio.ini`, Wokwi extension **sử dụng PlatformIO build** chứ KHÔNG compile trực tiếp trên cloud.

- Wokwi extension đọc **PlatformIO build output** từ `.pio/build/wokwi/firmware.bin`
- Nếu BỎ QUA step 3 → Simulation chạy code CŨ!

### PlatformIO Commands:

```bash
# Build firmware (BẮT BUỘC trước khi run Wokwi)
pio run

# Build + clean (nếu có lỗi lạ)
pio run --target clean && pio run

# Monitor serial (xem log debug)
pio device monitor

# Upload to ESP32 hardware (nếu có board thật)
pio run --target upload

# Xóa build artifacts
pio run --target clean
```

### Tips:

- ✅ Sau khi sửa code → **Luôn build lại** trước khi simulation
- ✅ Simulation không phản hồi? → Check Serial Monitor
- ✅ Code change không apply? → Bạn quên build!

## 🔌 Hardware Configuration (Wokwi)

### Components

| Component                | Số lượng | Mô tả                            |
| ------------------------ | -------- | -------------------------------- |
| ESP32 DevKit-C v4        | 1        | Main controller                  |
| RGB LED (Common Cathode) | 5        | Living (2), Bedroom (2), Kitchen |
| LED Trắng (Đơn)          | 1        | Bathroom                         |
| Resistor 220Ω            | 15       | 3 cho mỗi RGB LED                |
| PIR Motion Sensor        | 1        | Bathroom auto ON/OFF             |

### GPIO Pin Mapping

| Light         | Type  | R   | G   | B   | Note          |
| ------------- | ----- | --- | --- | --- | ------------- |
| Living Main   | RGB   | 25  | 13  | 26  | RGB1          |
| TV Area       | RGB   | 4   | 17  | 16  | RGB2          |
| Bed Headboard | RGB   | 23  | 22  | 21  | RGB3          |
| Bed Desk      | RGB   | 19  | 18  | 5   | RGB4          |
| Kitchen       | RGB   | 27  | 32  | 14  | RGB5          |
| Bathroom      | LED   | -   | -   | 33  | LED trắng     |
| PIR Sensor    | Input | -   | -   | 35  | Bathroom only |

### Schematic Diagram

```
ESP32 DevKit-C v4
├── RGB LEDs (5x) - Common Cathode
│   ├── Mỗi RGB channel: GPIO → 220Ω → LED (R/G/B)
│   └── Common cathode → GND
├── LED Trắng (1x) - Bathroom
│   └── GPIO 33 → LED → GND
└── PIR Sensor (1x) - Bathroom
    ├── VCC → 3V3
    ├── GND → GND
    └── OUT → GPIO 35
```

## 🔍 VSCode IntelliSense

PlatformIO tự động tạo `.vscode/c_cpp_properties.json` để hỗ trợ:

- Auto-complete cho ESP32 APIs
- Syntax highlighting
- Error detection trong editor

Nếu IntelliSense không hoạt động:

1. Reload VSCode (`Ctrl+Shift+P` → "Reload Window")
2. Hoặc chạy `pio init` để regenerate configs

## 📦 Thêm thư viện mới

```ini
# Trong platformio.ini, thêm vào lib_deps:
lib_deps =
    knolleary/PubSubClient@^2.8
    author/NewLibrary@^1.0.0  # Thêm library mới

# Hoặc cài manually:
pio lib install "author/LibraryName"
```

## 🐛 Troubleshooting

### Build errors:

```
"No such file or directory"
→ Kiểm tra file src/main.cpp tồn tại

"Library not found"
→ Chạy `pio lib install` để cài lại libraries

"PlatformIO not found"
→ Cài đặt: pip install platformio
```

### Simulation issues:

```
"Code change không apply"
→ Bạn quên build! Chạy `pio run`

"Simulation không phản hồi"
→ Check Serial Monitor: `pio device monitor`
```

### Upload to hardware:

```
"Failed to connect"
→ Kiểm tra port COM trong Device Manager
→ Cài driver CP2102/CH340 nếu cần

"Permission denied" (Linux/Mac)
→ Thêm user vào dialout group:
  sudo usermod -a -G dialout $USER
```

## 📚 References

- [PlatformIO Documentation](https://docs.platformio.org/)
- [ESP32 Arduino Framework](https://docs.espressif.com/projects/arduino-esp32/en/latest/)
- [Wokwi Documentation](https://docs.wokwi.com/)

---

**Được cập nhật lần cuối:** 20 June 2026
