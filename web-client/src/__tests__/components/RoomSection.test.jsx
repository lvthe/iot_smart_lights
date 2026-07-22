import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import RoomSection from '@/components/RoomSection';
import { MQTTProvider } from '@/context/MQTTContext';
import { ROOMS } from '@/utils/data.js';
import { getDevicesByRoom } from '@/utils/helpers.js';

// Wrapper component to provide context
const renderWithProvider = (component) => {
  return render(
    <MQTTProvider>
      {component}
    </MQTTProvider>
  );
};

describe('RoomSection Component', () => {
  describe('Rendering', () => {
    test('should render null when activeRoom is not provided', () => {
      const { container } = renderWithProvider(<RoomSection />);
      expect(container.firstChild).toBeNull();
    });

    test('should render null when activeRoom is invalid', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="invalid-room" />);
      expect(container.firstChild).toBeNull();
    });

    test('should render living room section', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);
      const section = container.querySelector('.room-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('id', 'living-room');
    });

    test('should render bedroom section', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="bedroom" />);
      const section = container.querySelector('.room-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('id', 'bedroom-room');
    });

    test('should render kitchen section', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="kitchen" />);
      const section = container.querySelector('.room-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('id', 'kitchen-room');
    });

    test('should render bathroom section', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="bathroom" />);
      const section = container.querySelector('.room-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('id', 'bathroom-room');
    });
  });

  describe('Device Rendering', () => {
    test('should render correct number of devices for living room', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);

      const deviceIds = getDevicesByRoom('living');
      const lightCards = container.querySelectorAll('[data-device^="living_"]');
      expect(lightCards).toHaveLength(deviceIds.length);
    });

    test('should render correct number of devices for bedroom', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="bedroom" />);

      const deviceIds = getDevicesByRoom('bedroom');
      const lightCards = container.querySelectorAll('[data-device^="bedroom_"]');
      expect(lightCards).toHaveLength(deviceIds.length);
    });

    test('should render one device for kitchen', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="kitchen" />);

      const lightCards = container.querySelectorAll('[data-device="kitchen"]');
      expect(lightCards).toHaveLength(1);
    });

    test('should render one device for bathroom', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="bathroom" />);

      const lightCards = container.querySelectorAll('[data-device="bathroom"]');
      expect(lightCards).toHaveLength(1);
    });

    test('should render all living room devices', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);

      const livingMain = container.querySelector('[data-device="living_main"]');
      const livingTV = container.querySelector('[data-device="living_tv"]');

      expect(livingMain).toBeInTheDocument();
      expect(livingTV).toBeInTheDocument();
    });

    test('should render all bedroom devices', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="bedroom" />);

      const headboard = container.querySelector('[data-device="bedroom_headboard"]');
      const desk = container.querySelector('[data-device="bedroom_desk"]');

      expect(headboard).toBeInTheDocument();
      expect(desk).toBeInTheDocument();
    });
  });

  describe('Section Structure', () => {
    test('should have correct section ID', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);

      const section = container.querySelector('#living-room');
      expect(section).toBeInTheDocument();
    });

    test('should have active class when room is provided', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);

      const section = container.querySelector('.room-section');
      expect(section).toHaveClass('active');
    });

    test('should render lights grid container', () => {
      const { container } = renderWithProvider(<RoomSection activeRoom="living" />);

      const grid = container.querySelector('.lights-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('All Rooms', () => {
    test('should render all 4 rooms correctly', () => {
      Object.keys(ROOMS).forEach(roomKey => {
        const { container, unmount } = renderWithProvider(<RoomSection activeRoom={roomKey} />);

        const deviceIds = getDevicesByRoom(roomKey);

        // Check section exists with correct ID
        const section = container.querySelector(`#${roomKey}-room`);
        expect(section).toBeInTheDocument();

        // Check correct number of devices
        const lightCards = container.querySelectorAll('[data-device]');
        expect(lightCards).toHaveLength(deviceIds.length);

        unmount();
      });
    });
  });
});
