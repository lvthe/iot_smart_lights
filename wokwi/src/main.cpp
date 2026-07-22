/*
 * IoT Smart Lights - ESP32 MQTT Control (Wokwi Version)
 * Hệ thống điều khiển đèn cho 6 phòng qua MQTT
 *
 * Hardware: 1x ESP32 DevKit-C v4 + 5x RGB LEDs + 1x LED đơn (Bathroom) + 1x PIR
 * Broker: EMQX Serverless (TLS, port 8883)
 * WiFi: Wokwi-GUEST
 *
 * Pin map ĐÃ ĐỒNG BỘ với diagram.json:
 * - Living Room Main (RGB1): R=25, G=13, B=26   -> light_id "living_main"
 * - TV Area           (RGB2): R=4,  G=17, B=16   -> light_id "living_tv"
 * - Bed Headboard     (RGB3): R=23, G=22, B=21   -> light_id "bedroom_headboard"
 * - Bed Desk          (RGB4): R=19, G=18, B=5    -> light_id "bedroom_desk"
 * - Kitchen           (RGB5): R=27, G=32, B=14   -> light_id "kitchen"
 * - Bathroom          (LED ): pin=33 (LED trắng đơn) -> light_id "bathroom"
 * - PIR Bathroom: pin=35 (input-only OK)
 *
 * PIR Bathroom: Auto BẬT khi có motion, TẮT sau 30s không motion
 *
 * ===== KẾT NỐI MQTT (chuyển sang EMQX) =====
 * - DÙNG 1 KẾT NỐI DUY NHẤT bằng tài khoản wokwi_device:
 *     vừa SUBSCRIBE esp32/control (nhận lệnh từ Web)
 *     vừa PUBLISH  esp32/status  (gửi trạng thái lên Web)
 * - Phòng nào được điều khiển/được báo trạng thái xác định bằng trường
 *   "light_id" TRONG BODY JSON (không dựa vào topic).
 *
 * Body control (Web -> ESP), ví dụ:
 *   { "light_id": "living_main", "state": "ON", "brightness": 80, "colorId": "cold_white" }
 * Body status (ESP -> Web), ví dụ:
 *   { "light_id": "living_main", "state": "ON", "brightness": 80,
 *     "colorId": "cold_white", "color": { "r":255, "g":255, "b":255 } }
 *
 * Log: mỗi dòng có tiền tố [hh:mm:ss] (giờ thực qua NTP, fallback uptime).
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <time.h>
#include <ThingSpeak.h>
#include "secrets.h" // MQTT_BROKER, MQTT_PORT, MQTT_USER, MQTT_PASSWORD, THINGSPEAK_* (gitignored, xem secrets.h.example)

// ==================== WiFi Credentials ====================
const char *WIFI_SSID = "Wokwi-GUEST";
const char *WIFI_PASSWORD = "";
#define WIFI_CHANNEL 6

// ==================== Time / NTP ====================
// Múi giờ Việt Nam = UTC+7. Đổi GMT_OFFSET nếu ở vùng khác.
const long GMT_OFFSET_SEC = 7 * 3600;
const int DAYLIGHT_OFFSET_SEC = 0;
const char *NTP_SERVER1 = "pool.ntp.org";
const char *NTP_SERVER2 = "time.nist.gov";

// 1 Client ID duy nhất (EMQX yêu cầu Client ID là duy nhất trên broker)
const char *MQTT_CLIENT_ID = "esp32-wokwi-device";

const unsigned long THINGSPEAK_CHECK_INTERVAL = 60000; // 1 phút
// NOTE: Chỉ upload khi state THAY ĐỔI

// ==================== GPIO Configuration ====================
// (Đã đồng bộ với diagram.json)

// RGB 1 - Living Room
#define RGB1_R_PIN 25
#define RGB1_G_PIN 13
#define RGB1_B_PIN 26

// RGB 2 - TV Area
#define RGB2_R_PIN 4
#define RGB2_G_PIN 17
#define RGB2_B_PIN 16

// RGB 3 - Bedroom Headboard
#define RGB3_R_PIN 23
#define RGB3_G_PIN 22
#define RGB3_B_PIN 21

// RGB 4 - Bedroom Desk
#define RGB4_R_PIN 19
#define RGB4_G_PIN 18
#define RGB4_B_PIN 5

// RGB 5 - Kitchen
#define RGB5_R_PIN 27
#define RGB5_G_PIN 32
#define RGB5_B_PIN 14

// RGB 6 - Bathroom = LED TRẮNG ĐƠN (chỉ 1 chân tín hiệu)
#define BATHROOM_PIN 33

// PIR Motion Sensor - Bathroom Only
#define PIR_PIN 35

#define BATHROOM_INDEX 5

// ==================== PIR Auto Mode Configuration ====================
const unsigned long PIR_TIMEOUT = 20000;       // 20 seconds (auto tắt sau 20s không motion)
const unsigned long COUNTDOWN_INTERVAL = 5000; // Update countdown mỗi 5s

// ==================== Timing ====================
const unsigned long LOOP_DELAY_MS = 100;                // chu kỳ vòng loop
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 30000;    // timeout kết nối WiFi (30s)
const unsigned long WIFI_STATUS_LOG_INTERVAL_MS = 3000; // in log status WiFi mỗi 3s
const unsigned long MQTT_CONNECT_TIMEOUT_MS = 30000;    // timeout kết nối MQTT (30s)
const unsigned long MQTT_RETRY_DELAY_MS = 5000;         // chờ giữa 2 lần thử lại MQTT
const unsigned long STATUS_BROADCAST_INTERVAL = 30000;  // 30 seconds - gửi status định kỳ
// LƯU Ý: KHÔNG hạ MQTT_RETRY_DELAY_MS xuống quá thấp (vd < 1000ms). EMQX Cloud
// cũng có rate-limit số lần kết nối; reconnect dồn dập có thể bị chặn tạm thời.

// ==================== MQTT Topics (CHUNG cho tất cả đèn) ====================
const char *CONTROL_TOPIC = "esp32/control"; // Web -> ESP (subscribe)
const char *STATUS_TOPIC = "esp32/status";   // ESP -> Web (publish)

// ==================== Light IDs (HỢP ĐỒNG với Web client) ====================
// Web phải gửi đúng các "light_id" này trong body; ESP cũng trả lại trong status.
const char *LIGHT_IDS[] = {
    "living_main",       // 0 - RGB1 Living Room Main (Đèn trùm)
    "living_tv",         // 1 - RGB2 TV Area
    "bedroom_headboard", // 2 - RGB3 Bedroom Headboard
    "bedroom_desk",      // 3 - RGB4 Bedroom Desk
    "kitchen",           // 4 - RGB5 Kitchen
    "bathroom"           // 5 - Bathroom LED đơn
};

const char *ROOM_NAMES[] = {"Đèn trùm",         "TV Area",     "Đèn đầu giường",
                            "Đèn bàn làm việc", "Đèn nhà bếp", "Đèn phòng tắm"};

// ==================== Color Palette (ESP là nguồn sự thật cho RGB) ====================
// Web chỉ gửi colorId ("cold_white"...). ESP tra bảng này -> RGB để lái LED,
// và trả lại cả id lẫn rgb trong status. RGB phải KHỚP COLOR_ARRAY của web.
struct ColorDef {
  const char *id;
  uint8_t r, g, b;
};

const ColorDef COLOR_PALETTE[] = {
    {"cold_white", 255, 255, 255}, // Trắng Lạnh
    {"warm_white", 255, 190, 120}, // Trắng Ấm
    {"warm_yellow", 255, 170, 0}   // Vàng Ấm
};
const int COLOR_PALETTE_SIZE = sizeof(COLOR_PALETTE) / sizeof(COLOR_PALETTE[0]);
const int DEFAULT_COLOR_INDEX = 0; // cold_white

// ==================== RGB LED State Structure ====================
struct RGBState {
  bool power;
  uint8_t colorIndex; // index vào COLOR_PALETTE (RGB suy ra từ palette)
  uint8_t brightness; // 0..100 (%)
};

// Mặc định khi khởi tạo ESP: TẮT đèn, màu Trắng Lạnh (index 0), độ sáng 100%
// -> khớp DEFAULT_COLOR_ID = COLD_WHITE và DEFAULT_BRIGHTNESS = 100 của web client
RGBState rgbStates[6] = {
    {false, DEFAULT_COLOR_INDEX, 100}, // Living
    {false, DEFAULT_COLOR_INDEX, 100}, // TV
    {false, DEFAULT_COLOR_INDEX, 100}, // Bed Head
    {false, DEFAULT_COLOR_INDEX, 100}, // Bed Desk
    {false, DEFAULT_COLOR_INDEX, 100}, // Kitchen
    {false, DEFAULT_COLOR_INDEX, 100}  // Bathroom (LED đơn, màu bỏ qua)
};

// ==================== ThingSpeak State Tracking ====================
// Lưu trạng thái trước đó để phát hiện thay đổi
RGBState lastRgbStates[6] = {{false, DEFAULT_COLOR_INDEX, 100}, {false, DEFAULT_COLOR_INDEX, 100},
                             {false, DEFAULT_COLOR_INDEX, 100}, {false, DEFAULT_COLOR_INDEX, 100},
                             {false, DEFAULT_COLOR_INDEX, 100}, {false, DEFAULT_COLOR_INDEX, 100}};
unsigned long lastThingSpeakCheck = 0;

// ==================== PIR State ====================
bool pirEnabled = true;
bool lastMotionState = false;
unsigned long lastMotionTime = 0;
unsigned long lastCountdownPrint = 0;

// ==================== Status Broadcast State ====================
unsigned long lastStatusBroadcast = 0;

// ==================== Pending Status Publish (Deferred from Callback) ====================
// KHÔNG gọi mqtt.publish() trong callback() để tránh reentrancy crash
// Thay vào đó set flag = true và publish trong loop()
bool pendingStatusPublish[6] = {false, false, false, false, false, false};
// Thêm timestamp để delay publish (tránh publish ngay sau callback)
unsigned long pendingStatusTime[6] = {0, 0, 0, 0, 0, 0};
const unsigned long PUBLISH_DELAY_MS = 100; // Đợi 100ms trước khi publish

// ==================== Global Variables ====================
// 1 kết nối TLS + 1 MQTT client cho cả subscribe và publish
WiFiClientSecure espClient;
PubSubClient mqtt(espClient);

// ThingSpeak client (dùng WiFiClient thường, không cần TLS)
WiFiClient thingspeakClient;

// ==================== Function Declarations ====================
String nowStamp();
void LOG(const String &msg);
void setupWiFi();
void setupMQTT();
void callback(char *topic, byte *payload, unsigned int length);
int getRoomIndexById(const char *id);
void handleCommand(int roomIndex, JsonDocument &doc);
void setPower(int roomIndex, bool state);
void setBrightness(int roomIndex, uint8_t value);
int findColorIndex(const char *id);
void setColorById(int roomIndex, const char *id);
void publishStatus(int roomIndex);
void publishAllStatus();
void updateRGBLED(int roomIndex);
void updateAllLEDs();

// ThingSpeak functions
bool hasThingSpeakStateChanged(int roomIndex);
void updateLastState(int roomIndex);
void uploadToThingSpeak();

// ==================== ThingSpeak Helper Functions ====================
bool hasThingSpeakStateChanged(int roomIndex) {
  if (roomIndex < 0 || roomIndex >= 6)
    return false;
  return (rgbStates[roomIndex].power != lastRgbStates[roomIndex].power);
}

void updateLastState(int roomIndex) {
  if (roomIndex < 0 || roomIndex >= 6)
    return;
  lastRgbStates[roomIndex] = rgbStates[roomIndex];
}

void uploadToThingSpeak() {
  // Field 1-6: Power state của 6 đèn
  LOG("[THING_SPEAK] >>>>>>>>>> Uploading states to ThingSpeak... <<<<<<<<<<");
  for (int i = 0; i < 6; i++) {
    int fieldValue = rgbStates[i].power ? 1 : 0;
    ThingSpeak.setField(i + 1, fieldValue);
    String stateStr = fieldValue ? "ON" : "OFF";
    LOG("[THING_SPEAK]   " + String(ROOM_NAMES[i]) + " -> " + stateStr);
  }

  // Upload
  int response = ThingSpeak.writeFields(THINGSPEAK_CHANNEL_ID, THINGSPEAK_WRITE_API_KEY);

  if (response == 200) {
    LOG("[THING_SPEAK] Upload OK");
  } else {
    LOG("[THING_SPEAK] Upload FAILED - code=" + String(response));
  }
}

// ==================== Logging helpers ====================
// Trả về chuỗi "[hh:mm:ss]". Nếu NTP chưa sync -> dùng uptime từ lúc boot.
String nowStamp() {
  time_t now = time(nullptr);
  char buf[12];

  if (now < 100000) { // chưa có giờ thực
    unsigned long s = millis() / 1000;
    sprintf(buf, "[%02lu:%02lu:%02lu]", (s / 3600) % 100, (s / 60) % 60, s % 60);
  } else {
    struct tm t;
    localtime_r(&now, &t);
    sprintf(buf, "[%02d:%02d:%02d]", t.tm_hour, t.tm_min, t.tm_sec);
  }
  return String(buf);
}

// In một dòng log có tiền tố thời gian.
void LOG(const String &msg) {
  Serial.print(nowStamp());
  Serial.print(" ");
  Serial.println(msg);
}

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(RGB1_R_PIN, OUTPUT);
  pinMode(RGB1_G_PIN, OUTPUT);
  pinMode(RGB1_B_PIN, OUTPUT);

  pinMode(RGB2_R_PIN, OUTPUT);
  pinMode(RGB2_G_PIN, OUTPUT);
  pinMode(RGB2_B_PIN, OUTPUT);

  pinMode(RGB3_R_PIN, OUTPUT);
  pinMode(RGB3_G_PIN, OUTPUT);
  pinMode(RGB3_B_PIN, OUTPUT);

  pinMode(RGB4_R_PIN, OUTPUT);
  pinMode(RGB4_G_PIN, OUTPUT);
  pinMode(RGB4_B_PIN, OUTPUT);

  pinMode(RGB5_R_PIN, OUTPUT);
  pinMode(RGB5_G_PIN, OUTPUT);
  pinMode(RGB5_B_PIN, OUTPUT);

  pinMode(BATHROOM_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);

  updateAllLEDs();

  setupWiFi();
  setupMQTT();

  // ThingSpeak initialization
  ThingSpeak.begin(thingspeakClient);
  LOG("ThingSpeak initialized");

  LOG("Setup complete!");
}

// ==================== Main Loop ====================
void loop() {
  if (!mqtt.connected()) {
    // Log khi disconnect (chỉ log nếu không phải lần đầu khởi động)
    static bool firstRun = true;
    if (!firstRun && mqtt.state() != MQTT_DISCONNECTED) {
      LOG("[MQTT] DISCONNECTED! state=" + String(mqtt.state()) + " -> reconnecting...");
    }
    firstRun = false;
    setupMQTT();
  }
  mqtt.loop();

  // ===== DEFERRED PUBLISH (Process flags set in callback) =====
  // Publish status cho các đèn có pendingStatusPublish = true
  // CHỈ publish sau khi đã đủ delay (tránh publish ngay sau callback)
  bool hasPendingPublish = false;
  for (int i = 0; i < 6; i++) {
    if (pendingStatusPublish[i]) {
      // Check xem đã đủ delay chưa
      if (millis() - pendingStatusTime[i] >= PUBLISH_DELAY_MS) {
        pendingStatusPublish[i] = false; // Xóa flag TRƯỚC khi publish
        publishStatus(i);
        LOG("[MQTT] LOOP: Processed deferred publish for " + String(ROOM_NAMES[i]) + " (delayed " +
            String(millis() - pendingStatusTime[i]) + "ms)");
        hasPendingPublish = true;
      }
    }
  }

  // QUAN TRỌNG: Gọi mqtt.loop() lại SAU KHI publish để process inbound packets
  // (ping response, CONNACK, v.v.) - tránh disconnect
  if (hasPendingPublish) {
    mqtt.loop();
  }

  // PIR Motion Detection - Bathroom only
  bool motionDetected = digitalRead(PIR_PIN) == HIGH;

  // ===== PIR AUTO ON =====
  if (motionDetected != lastMotionState) {
    lastMotionState = motionDetected;
    if (motionDetected) {
      lastMotionTime = millis(); // Reset timer mỗi khi có motion
      LOG("PIR: Motion detected in bathroom!");
      if (pirEnabled && !rgbStates[BATHROOM_INDEX].power) {
        setPower(BATHROOM_INDEX, true);
        updateRGBLED(BATHROOM_INDEX);
        pendingStatusPublish[BATHROOM_INDEX] = true;
        LOG("PIR: Auto ON bathroom light (pending)");
      } else if (!pirEnabled) {
        LOG("PIR: Motion IGNORED (pirEnabled=false - manual control mode)");
      } else if (rgbStates[BATHROOM_INDEX].power) {
        LOG("PIR: Motion IGNORED (light already ON)");
      }
    }
  }

  // ===== PIR AUTO OFF (FIXED: Luôn kiểm tra timeout, bất kể motion state) =====
  if (pirEnabled && rgbStates[BATHROOM_INDEX].power) {
    unsigned long elapsedTime = millis() - lastMotionTime;
    long remainingSeconds = (PIR_TIMEOUT - elapsedTime) / 1000;

    // In countdown mỗi 5s, chỉ khi đã trôi qua 5s từ lần motion cuối
    if (elapsedTime >= COUNTDOWN_INTERVAL && millis() - lastCountdownPrint >= COUNTDOWN_INTERVAL) {
      lastCountdownPrint = millis();
      LOG("PIR: Auto OFF countdown: " + String(remainingSeconds) + " seconds");
    }

    // TẮT đèn sau timeout (dù PIR vẫn HIGH)
    if (elapsedTime > PIR_TIMEOUT) {
      setPower(BATHROOM_INDEX, false);
      updateRGBLED(BATHROOM_INDEX);
      pendingStatusPublish[BATHROOM_INDEX] = true;
      LOG("PIR: Tự động tắt đèn vì không phát hiện chuyển động");
    }
  } else {
    lastCountdownPrint = millis();
  }

  // Periodic Status Broadcast - gửi status tất cả đèn mỗi 30s
  if (millis() - lastStatusBroadcast >= STATUS_BROADCAST_INTERVAL) {
    lastStatusBroadcast = millis();
    publishAllStatus();
    mqtt.loop(); // Process inbound packets sau broadcast
  }

  // ===== ThingSpeak Upload (1 phút interval) =====
  if (millis() - lastThingSpeakCheck >= THINGSPEAK_CHECK_INTERVAL) {
    lastThingSpeakCheck = millis();

    bool anyChanged = false;
    for (int i = 0; i < 6; i++) {
      if (hasThingSpeakStateChanged(i)) {
        anyChanged = true;
        updateLastState(i);
      }
    }

    if (anyChanged) {
      uploadToThingSpeak(); // Chỉ log "Upload OK" hoặc "Upload FAILED"
    }
  }

  delay(LOOP_DELAY_MS);
}

// ==================== WiFi Setup ====================
void setupWiFi() {
  WiFi.mode(WIFI_STA); // đảm bảo chế độ station trước khi begin
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD, WIFI_CHANNEL);

  unsigned long startAttempt = millis(); // mốc in log status WiFi
  unsigned long connectStart = millis(); // mốc tính timeout tổng

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);

    // In trạng thái chờ theo interval đã cấu hình
    if (millis() - startAttempt >= WIFI_STATUS_LOG_INTERVAL_MS) {
      startAttempt = millis();
      LOG("WIFI: still connecting... status=" + String(WiFi.status()));
    }

    // Timeout -> reset chip để thử lại từ đầu (tránh kẹt vô hạn)
    if (millis() - connectStart > WIFI_CONNECT_TIMEOUT_MS) {
      LOG("WIFI: timeout " + String(WIFI_CONNECT_TIMEOUT_MS / 1000) + "s -> ESP.restart()");
      delay(100); // cho Serial kịp đẩy log ra
      ESP.restart();
    }
  }

  LOG("WIFI CONNECTED: SSID=" + WiFi.SSID() + " IP=" + WiFi.localIP().toString());

  // Đồng bộ giờ thực qua NTP (cho timestamp [hh:mm:ss])
  configTime(GMT_OFFSET_SEC, DAYLIGHT_OFFSET_SEC, NTP_SERVER1, NTP_SERVER2);
  // LOG("NTP: time sync requested (UTC+7)");
}

// ==================== MQTT Setup (1 kết nối: subscribe + publish) ====================
void setupMQTT() {
  // LOG("MQTT: setup (1 connection - subscribe control + publish status)");

  // TLS bỏ qua kiểm tra chứng chỉ server - CHỈ chấp nhận được cho Wokwi simulation/demo.
  // KHÔNG dùng setInsecure() trên phần cứng thật/production vì mất khả năng xác thực
  // broker, dễ bị man-in-the-middle. Với hardware thật cần dùng espClient.setCACert(...).
  espClient.setInsecure();

  mqtt.setServer(MQTT_BROKER, MQTT_PORT);
  mqtt.setCallback(callback);

  // Cấu hình keepalive để giữ kết nối (MQTT spec default = 60s)
  mqtt.setKeepAlive(60); // 60 seconds - ping broker mỗi phút

  // Tăng buffer size để tránh overflow khi message dài
  mqtt.setBufferSize(512); // 512 bytes thay vì default 256
  // LOG("MQTT: keepalive=60s, buffer=512 bytes");

  unsigned long connectStart = millis(); // mốc tính timeout tổng

  while (!mqtt.connected()) {
    //  Gán kết quả connect vào biến, rồi mới check biến đó
    bool connected_mqtt = mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASSWORD);

    if (connected_mqtt) {
      LOG("[MQTT] CONNECTED: " + String(MQTT_BROKER) + ":" + String(MQTT_PORT));

      // Subscribe topic control chung cho tất cả đèn
      mqtt.subscribe(CONTROL_TOPIC);
      LOG("[MQTT] Subscribed to " + String(CONTROL_TOPIC));

      // Publish trạng thái ban đầu cho cả 6 đèn
      publishAllStatus();
    } else {
      // Timeout -> restart ESP
      if (millis() - connectStart > MQTT_CONNECT_TIMEOUT_MS) {
        LOG("[MQTT] Timeout " + String(MQTT_CONNECT_TIMEOUT_MS / 1000) + "s -> ESP.restart()");
        delay(100); // cho Serial kịp đẩy log ra
        ESP.restart();
      }
      LOG("[MQTT] Connect failed rc=" + String(mqtt.state()) + " - retry");
      delay(MQTT_RETRY_DELAY_MS);
    }
  }
}

// ==================== MQTT Callback ====================
void callback(char *topic, byte *payload, unsigned int length) {
  LOG("[MQTT] Callback starting...");
  LOG("[MQTT] Free heap BEFORE = " + String(ESP.getFreeHeap()));

  // Gom payload thành chuỗi để in trên 1 dòng có timestamp
  String payloadStr;
  payloadStr.reserve(length);
  for (unsigned int i = 0; i < length; i++) {
    payloadStr += (char)payload[i];
  }

  LOG("[MQTT] Receive: topic=" + String(topic) + " len=" + String(length));
  LOG("[MQTT] Receive: payload=" + payloadStr);

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    LOG("[MQTT] JSON parse error: " + String(error.c_str()));
    return;
  }

  // Phòng được xác định bằng "light_id" trong body
  if (!doc.containsKey("light_id")) {
    LOG("[MQTT] Missing light_id -> skip");
    return;
  }

  const char *lightId = doc["light_id"];
  int roomIndex = getRoomIndexById(lightId);
  if (roomIndex >= 0) {
    handleCommand(roomIndex, doc);
  } else {
    LOG("[MQTT] Unknown light_id: " + String(lightId) + " -> skip");
  }
  // LOG("[MQTT] Callback finished");
}

// ==================== Get Room Index from light_id ====================
int getRoomIndexById(const char *id) {
  for (int i = 0; i < 6; i++) {
    if (strcmp(LIGHT_IDS[i], id) == 0) {
      return i;
    }
  }
  return -1;
}

// ==================== Handle Command ====================
void handleCommand(int roomIndex, JsonDocument &doc) {
  // ===== PIR AUTO MODE LOGIC =====
  // - Web BẬT đèn → Disable PIR (giữ đèn sáng liên tục)
  // - Web TẮT đèn → Enable PIR (sẵn sàng cho motion detection)
  if (roomIndex == BATHROOM_INDEX && doc.containsKey("state")) {
    String state = doc["state"];
    if (state == "ON") {
      pirEnabled = false;
      LOG("Bathroom: PIR auto mode DISABLED (manual ON)");
    } else {
      pirEnabled = true;
      LOG("Bathroom: PIR auto mode ENABLED (manual OFF - ready for motion)");
    }
  }

  if (doc.containsKey("state")) {
    String state = doc["state"];
    setPower(roomIndex, state == "ON");
  }

  if (doc.containsKey("brightness")) {
    setBrightness(roomIndex, doc["brightness"]);
  }

  // Màu: web gửi colorId (vd "cold_white"). Chỉ áp dụng cho RGB, bỏ qua LED đơn.
  if (roomIndex != BATHROOM_INDEX && doc.containsKey("colorId")) {
    const char *id = doc["colorId"];
    setColorById(roomIndex, id);
  }

  updateRGBLED(roomIndex);
  // ĐẶU LẬI: Không gọi publishStatus() trong callback để tránh reentrancy crash
  // Set flag và timestamp để publish trong loop() với delay
  pendingStatusPublish[roomIndex] = true;
  pendingStatusTime[roomIndex] = millis(); // Ghi thời điểm set flag
  LOG("[MQTT] Set pendingStatusPublish[" + String(roomIndex) + "] = true (will publish in 100ms)");
}

// ==================== Set Power ====================
void setPower(int roomIndex, bool state) {
  rgbStates[roomIndex].power = state;
  LOG(String(ROOM_NAMES[roomIndex]) + " Power: " + String(state ? "ON" : "OFF"));
}

// ==================== Set Brightness ====================
void setBrightness(int roomIndex, uint8_t value) {
  rgbStates[roomIndex].brightness = constrain(value, 0, 100);
  LOG(String(ROOM_NAMES[roomIndex]) + " Brightness: " + String(rgbStates[roomIndex].brightness));
}

// ==================== Tìm index màu theo id ====================
int findColorIndex(const char *id) {
  for (int i = 0; i < COLOR_PALETTE_SIZE; i++) {
    if (strcmp(COLOR_PALETTE[i].id, id) == 0) {
      return i;
    }
  }
  return -1; // không có trong palette
}

// ==================== Set màu theo id (tra palette) ====================
void setColorById(int roomIndex, const char *id) {
  int idx = findColorIndex(id);
  if (idx < 0) {
    LOG(String(ROOM_NAMES[roomIndex]) + " unknown colorId: " + String(id) + " (giữ màu cũ)");
    return;
  }
  rgbStates[roomIndex].colorIndex = idx;
  LOG(String(ROOM_NAMES[roomIndex]) + " Color: " + String(COLOR_PALETTE[idx].id) + " (" + String(COLOR_PALETTE[idx].r) +
      "," + String(COLOR_PALETTE[idx].g) + "," + String(COLOR_PALETTE[idx].b) + ")");
}

// ==================== Update Single LED ====================
void updateRGBLED(int roomIndex) {
  // Bathroom = LED đơn: chỉ dùng 1 chân, điều khiển theo brightness
  if (roomIndex == BATHROOM_INDEX) {
    if (!rgbStates[BATHROOM_INDEX].power) {
      // ⚠️ FIX WOKWI: Dùng analogWrite(0) thay vì digitalWrite(LOW)
      // vì trên ESP32 digitalWrite không tắt được kênh PWM đã kích hoạt
      analogWrite(BATHROOM_PIN, 0);
      return;
    }
    uint8_t level = map(rgbStates[BATHROOM_INDEX].brightness, 0, 100, 0, 255);
    analogWrite(BATHROOM_PIN, level);
    return;
  }

  // Các phòng RGB (index 0..4)
  uint8_t pinsR[] = {RGB1_R_PIN, RGB2_R_PIN, RGB3_R_PIN, RGB4_R_PIN, RGB5_R_PIN};
  uint8_t pinsG[] = {RGB1_G_PIN, RGB2_G_PIN, RGB3_G_PIN, RGB4_G_PIN, RGB5_G_PIN};
  uint8_t pinsB[] = {RGB1_B_PIN, RGB2_B_PIN, RGB3_B_PIN, RGB4_B_PIN, RGB5_B_PIN};

  if (!rgbStates[roomIndex].power) {
    // ⚠️ FIX WOKWI: Dùng analogWrite(0) thay vì digitalWrite(LOW)
    // vì trên ESP32 digitalWrite không tắt được kênh PWM đã kích hoạt
    analogWrite(pinsR[roomIndex], 0);
    analogWrite(pinsG[roomIndex], 0);
    analogWrite(pinsB[roomIndex], 0);
    return;
  }

  // Lấy RGB từ palette theo colorIndex
  ColorDef c = COLOR_PALETTE[rgbStates[roomIndex].colorIndex];
  uint8_t brightness = map(rgbStates[roomIndex].brightness, 0, 100, 0, 255);

  analogWrite(pinsR[roomIndex], (c.r * brightness) / 255);
  analogWrite(pinsG[roomIndex], (c.g * brightness) / 255);
  analogWrite(pinsB[roomIndex], (c.b * brightness) / 255);
}

// ==================== Update All LEDs ====================
void updateAllLEDs() {
  for (int i = 0; i < 6; i++) {
    updateRGBLED(i);
  }
}

// ==================== Publish Status (Periodic Broadcast) ====================
void publishAllStatus() {
  LOG("[MQTT] >>>>>>>>>> STATUS BROADCAST: Publishing all 6 lights status... <<<<<<<<<<");
  for (int i = 0; i < 6; i++) {
    publishStatus(i);
  }
}

// ==================== Publish Status (Single Light) ====================
void publishStatus(int roomIndex) {
  JsonDocument doc;
  doc["light_id"] = LIGHT_IDS[roomIndex]; // BẮT BUỘC: web lọc theo light_id
  doc["state"] = rgbStates[roomIndex].power ? "ON" : "OFF";

  // Luôn gửi brightness và color để web sync đúng state (kể cả khi OFF)
  doc["brightness"] = rgbStates[roomIndex].brightness;

  // LED đơn (bathroom) không có màu; RGB chỉ gửi cho các phòng RGB
  if (roomIndex != BATHROOM_INDEX) {
    ColorDef c = COLOR_PALETTE[rgbStates[roomIndex].colorIndex];
    doc["colorId"] = c.id; // để web highlight nút đang chọn

    JsonObject colorObj = doc["color"].to<JsonObject>();
    colorObj["r"] = c.r; // để web CSS đúng màu bóng
    colorObj["g"] = c.g;
    colorObj["b"] = c.b;
  }

  String output;
  serializeJson(doc, output);

  if (mqtt.connected()) {
    bool result = mqtt.publish(STATUS_TOPIC, output.c_str());
    LOG("[MQTT] Transmit: " + String(ROOM_NAMES[roomIndex]) + " -> " + String(STATUS_TOPIC) + " " + output);
    if (!result) {
      LOG("[MQTT] FAILED to publish for " + String(ROOM_NAMES[roomIndex]));
    }
  } else {
    LOG("[MQTT] Client not connected! state=" + String(mqtt.state()));
  }
}
