import { IS_USING_MQTT_STATE } from '@/utils/constants.js';
import SensorDisplay from './SensorDisplay';

const Header = () => {
  return (
    <header className="header">
      <h1>🏠 Smart Home Lighting Control</h1>
      <SensorDisplay />
      {!IS_USING_MQTT_STATE && <span className="mode-badge dev-mode">Dev Mode</span>}
    </header>
  );
};

export default Header;
