/**
 * MainTabNav - Main navigation between Control and Activity Log
 * Allows users to switch between light control and usage statistics
 */
import React from 'react';

function MainTabNav({ activeTab, onTabChange }) {
  return (
    <nav className="main-tab-nav">
      <button
        className={activeTab === 'control' ? 'active' : ''}
        onClick={() => onTabChange('control')}
        aria-label="Điều khiển đèn"
      >
        <span>Điều khiển đèn</span>
      </button>
      <button
        className={activeTab === 'activity' ? 'active' : ''}
        onClick={() => onTabChange('activity')}
        aria-label="Nhật ký hoạt động"
      >
        <span>Nhật ký hoạt động</span>
      </button>
    </nav>
  );
}

export default MainTabNav;
