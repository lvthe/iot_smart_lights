import { describe, test, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LightCard from '@/components/LightCard';
import { MQTTProvider } from '@/context/MQTTContext';
import { DEVICES } from '@/utils/data.js';

// Wrapper component to provide context
const renderWithProvider = (component) => {
  return render(
    <MQTTProvider>
      {component}
    </MQTTProvider>
  );
};

describe('LightCard Component', () => {
  const rgbLightId = 'living_main';
  const bathroomLightId = 'bathroom';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    test('should render device name and icon', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const device = DEVICES[rgbLightId];
      expect(screen.getByText(device.name)).toBeInTheDocument();
      expect(container.querySelector('.card-icon')).toHaveTextContent('💡');
    });

    test('should render with correct data-device attribute', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const card = container.querySelector(`[data-device="${rgbLightId}"]`);
      expect(card).toBeInTheDocument();
    });

    test('should render power toggle in off state when device is off', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(false);

      const toggle = container.querySelector('.power-toggle');
      expect(toggle).toHaveClass('off');
    });

    test('should render brightness percentage', () => {
      renderWithProvider(<LightCard lightId={rgbLightId} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Power Toggle', () => {
    test('should render power toggle checkbox', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
    });

    test('should have unchecked state initially', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const checkbox = container.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('Brightness Control', () => {
    test('should render brightness slider', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const slider = container.querySelector('input[type="range"]');
      expect(slider).toBeInTheDocument();
    });

    test('should have correct slider attributes', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const slider = container.querySelector('input[type="range"]');
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    test('should display brightness value', () => {
      renderWithProvider(<LightCard lightId={rgbLightId} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('should be disabled when device is off', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const slider = container.querySelector('input[type="range"]');
      expect(slider.disabled).toBe(true);
    });
  });

  describe('Color Picker (RGB devices only)', () => {
    test('should render color presets for RGB device', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const presets = container.querySelectorAll('.color-preset-btn');
      expect(presets.length).toBeGreaterThan(0);
    });

    test('should not render color presets for bathroom (single LED)', () => {
      const { container } = renderWithProvider(<LightCard lightId={bathroomLightId} />);

      const presets = container.querySelectorAll('.color-preset-btn');
      expect(presets).toHaveLength(0);
    });
  });

  describe('Card Styling', () => {
    test('should not have "on" class when device is off', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      const card = container.querySelector('.light-card');
      expect(card).not.toHaveClass('on');
    });

    test('should have proper card structure', () => {
      const { container } = renderWithProvider(<LightCard lightId={rgbLightId} />);

      expect(container.querySelector('.card-header')).toBeInTheDocument();
      expect(container.querySelector('.card-body')).toBeInTheDocument();
      expect(container.querySelector('.card-controls')).toBeInTheDocument();
      expect(container.querySelector('.card-title')).toBeInTheDocument();
      expect(container.querySelector('.card-icon')).toBeInTheDocument();
    });
  });

  describe('Different Devices', () => {
    test('should render bedroom headboard light correctly', () => {
      const { container } = renderWithProvider(<LightCard lightId="bedroom_headboard" />);

      const device = DEVICES.bedroom_headboard;
      expect(screen.getByText(device.name)).toBeInTheDocument();
      expect(container.querySelector('[data-device="bedroom_headboard"]')).toBeInTheDocument();
    });

    test('should render kitchen light correctly', () => {
      const { container } = renderWithProvider(<LightCard lightId="kitchen" />);

      const device = DEVICES.kitchen;
      expect(screen.getByText(device.name)).toBeInTheDocument();
      expect(container.querySelector('[data-device="kitchen"]')).toBeInTheDocument();
    });

    test('should render bathroom light correctly', () => {
      const { container } = renderWithProvider(<LightCard lightId={bathroomLightId} />);

      const device = DEVICES.bathroom;
      expect(screen.getByText(device.name)).toBeInTheDocument();
      expect(container.querySelector('[data-device="bathroom"]')).toBeInTheDocument();
    });
  });
});
