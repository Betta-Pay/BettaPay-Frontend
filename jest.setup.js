import '@testing-library/jest-dom';

// Polyfill TextEncoder and TextDecoder for jsdom environments (common issue with Stellar SDK etc.)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // Deprecated
      removeListener: jest.fn(), // Deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// jsdom does not implement canvas; QR rendering tests only need a drawing surface.
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(), fillRect: jest.fn(), drawImage: jest.fn(),
  getImageData: jest.fn(), putImageData: jest.fn(), createImageData: jest.fn(),
  setTransform: jest.fn(), resetTransform: jest.fn(), scale: jest.fn(),
  save: jest.fn(), restore: jest.fn(), beginPath: jest.fn(), closePath: jest.fn(),
  moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn(), fill: jest.fn(),
  translate: jest.fn(), rotate: jest.fn(), arc: jest.fn(), rect: jest.fn(),
  clip: jest.fn(), measureText: jest.fn(() => ({ width: 0 })), fillText: jest.fn(),
}));

// Mock custom UI components that use complex Base UI primitives to avoid JSDOM compatibility issues
jest.mock('@/components/ui/input', () => {
  const React = require('react');
  const Input = React.forwardRef(({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={className}
        {...props}
      />
    );
  });
  Input.displayName = 'Input';
  return { Input };
});

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const Button = React.forwardRef(({ className, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </button>
    );
  });
  Button.displayName = 'Button';
  return { Button };
});
