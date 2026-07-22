import { useState } from 'react';
import { MQTTProvider, useMQTT } from './context/MQTTContext';
import Header from './components/Header';
import GlobalToggle from './components/GlobalToggle';
import RoomTabs from './components/RoomTabs';
import RoomSection from './components/RoomSection';
import LogsSection from './components/LogsSection';
import GlobalLoading from './components/GlobalLoading';
import MainTabNav from './components/MainTabNav';
import ActivityLog from './components/ActivityLog';
import './index.css';

function AppContent() {
  const [activeRoom, setActiveRoom] = useState('living');
  const [activeMainTab, setActiveMainTab] = useState('control');
  const { logs } = useMQTT();

  return (
    <div className="container">
      <Header />

      <MainTabNav
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
      />

      {activeMainTab === 'control' ? (
        <>
          <GlobalToggle />

          <RoomTabs
            activeRoom={activeRoom}
            setActiveRoom={setActiveRoom}
          />

          <main>
            <RoomSection activeRoom={activeRoom} />

            <LogsSection logs={logs} />
          </main>
        </>
      ) : (
        <ActivityLog />
      )}

      <GlobalLoading />
    </div>
  );
}

function App() {
  return (
    <MQTTProvider>
      <AppContent />
    </MQTTProvider>
  );
}

export default App;
