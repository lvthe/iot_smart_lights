import { ROOMS } from '@/utils/data.js';
import { getDevicesByRoom } from '@/utils/helpers.js';
import { useMQTT } from '@/context/MQTTContext';

const RoomTabs = ({ activeRoom, setActiveRoom }) => {
  const { deviceStates } = useMQTT();

  // Check if ANY light in room is on
  const getRoomLightState = (roomId) => {
    const deviceIds = getDevicesByRoom(roomId);
    if (!deviceIds || deviceIds.length === 0) return false;
    return deviceIds.some(lightId => deviceStates[lightId]?.on) || false;
  };

  return (
    <nav className="room-tabs">
      {Object.values(ROOMS).map(room => (
        <button
          key={room.id}
          className={`room-tab ${activeRoom === room.id ? 'active' : ''}`}
          onClick={() => setActiveRoom(room.id)}
        >
          <span className="tab-icon">{room.icon}</span>
          <span className="tab-name">{room.name}</span>
          <span
            className={`tab-light-indicator ${getRoomLightState(room.id) ? 'lit' : ''}`}
          >
            💡
          </span>
        </button>
      ))}
    </nav>
  );
};

export default RoomTabs;
