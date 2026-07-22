import { IS_USING_MQTT_STATE } from '@/utils/constants.js';

const Header = () => {
  return (
    <header className="header">
      <h1>🏠 Smart Home Lighting Control</h1>
      {!IS_USING_MQTT_STATE && <span className="mode-badge dev-mode">Dev Mode</span>}
    </header>
  );
};

export default Header;
