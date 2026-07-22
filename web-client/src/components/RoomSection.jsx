import { ROOMS } from '@/utils/data.js';
import { getDevicesByRoom } from '@/utils/helpers.js';
import LightCard from '@/components/LightCard';

const RoomSection = ({ activeRoom }) => {
  const room = ROOMS[activeRoom];

  if (!room) return null;

  const deviceIds = getDevicesByRoom(activeRoom);

  return (
    <section className={`room-section ${activeRoom ? 'active' : ''}`} id={`${activeRoom}-room`}>
      <div className="lights-grid">
        {deviceIds.map(lightId => (
          <LightCard
            key={lightId}
            lightId={lightId}
          />
        ))}
      </div>
    </section>
  );
};

export default RoomSection;
