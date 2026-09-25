import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

// next/link needs no router context in these unit tests; render a plain anchor.
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ href, children, ...props }: any) =>
      React.createElement('a', { href, ...props }, children),
  };
});

// Child whose throwing is toggleable so we can exercise the reset path.
let shouldThrow = true;
function MaybeBoom() {
  if (shouldThrow) throw new Error('render blew up');
  return <div>recovered content</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    shouldThrow = true;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    shouldThrow = false;
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>
    );
    expect(screen.getByText('recovered content')).toBeInTheDocument();
  });

  it('renders the fallback UI and logs the error when a child throws', () => {
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /go to dashboard/i })
    ).toHaveAttribute('href', '/dashboard');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unhandled render error caught by ErrorBoundary',
      expect.anything(),
      expect.anything()
    );
  });

  it('resets and re-renders children when Try Again is clicked', () => {
    render(
      <ErrorBoundary>
        <MaybeBoom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

    // The child stops throwing, then the user retries.
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered content')).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  describe('resetKey', () => {
    function ResetHost({ resetKey }: { resetKey: string | number }) {
      return (
        <ErrorBoundary resetKey={resetKey}>
          <MaybeBoom />
        </ErrorBoundary>
      );
    }

    it('clears the error state when the parent changes the resetKey', () => {
      const { rerender } = render(<ResetHost resetKey="attempt-0" />);
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      // The child stops throwing, then the parent bumps the key to remount.
      shouldThrow = false;
      rerender(<ResetHost resetKey="attempt-1" />);

      expect(screen.getByText('recovered content')).toBeInTheDocument();
      expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
    });

    it('keeps the fallback when the resetKey is unchanged', () => {
      const { rerender } = render(<ResetHost resetKey="attempt-0" />);
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

      rerender(<ResetHost resetKey="attempt-0" />);

      // Same key → no reset; the child would still be throwing, so if the
      // boundary had reset the render would throw again and fail this test.
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
