// Device configuration - mỗi device = 1 light
export const DEVICES = {
  living_main: {
    id: 'living_main',
    name: 'Đèn trùm',
    type: 'rgb',
    field_thingspeak: 'field1',
    room_key: 'living'
  },
  living_tv: {
    id: 'living_tv',
    name: 'TV Area',
    type: 'rgb',
    field_thingspeak: 'field2',
    room_key: 'living'
  },
  bedroom_headboard: {
    id: 'bedroom_headboard',
    name: 'Đèn đầu giường',
    type: 'rgb',
    field_thingspeak: 'field3',
    room_key: 'bedroom'
  },
  bedroom_desk: {
    id: 'bedroom_desk',
    name: 'Đèn bàn làm việc',
    type: 'rgb',
    field_thingspeak: 'field4',
    room_key: 'bedroom'
  },
  kitchen: {
    id: 'kitchen',
    name: 'Đèn nhà bếp',
    type: 'rgb',
    field_thingspeak: 'field5',
    room_key: 'kitchen'
  },
  bathroom: {
    id: 'bathroom',
    name: 'Đèn phòng tắm',
    type: 'single',
    field_thingspeak: 'field6',  // LED trắng đơn
    room_key: 'bathroom'
  }
};

// Room configuration
export const ROOMS = {
  living: {
    id: 'living',
    name: 'Phòng khách',
    icon: '🛋️'
  },
  bedroom: {
    id: 'bedroom',
    name: 'Phòng ngủ',
    icon: '🛏️'
  },
  kitchen: {
    id: 'kitchen',
    name: 'Nhà bếp',
    icon: '🍳'
  },
  bathroom: {
    id: 'bathroom',
    name: 'Phòng tắm',
    icon: '🚿'
  }
};
