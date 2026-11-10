import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  LinkAnalytics,
  buildLinkAnalyticsCsv,
  escapeCsvCell,
  type LinkAnalyticsData,
} from '../LinkAnalytics';

jest.mock('next/dynamic', () => () => {
  const MockChart = () => <div data-testid="clicks-chart" />;
  return MockChart;
});

describe('LinkAnalytics CSV export (#880)', () => {
  const sampleAnalyticsData: LinkAnalyticsData = {
    totalViews: 500,
    uniqueVisitors: 360,
    conversionRate: 20,
    revenue: 1200,
    currency: 'USDC',
    viewsTimeline: [
      { date: 'Aug 1', clicks: 10, conversions: 2, volume: 400 },
      { date: 'Aug 2, 2026', clicks: 20, conversions: 4, volume: 800 },
    ],
    geographicBreakdown: [],
    referrerList: [],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('escapeCsvCell & buildLinkAnalyticsCsv', () => {
    it('escapes commas, double quotes, and newlines per RFC 4180 and neutralizes formula injection', () => {
      expect(escapeCsvCell('Aug 1, 2026')).toBe('"Aug 1, 2026"');
      expect(escapeCsvCell('Say "Hello"')).toBe('"Say ""Hello"""');
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
      expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
      expect(escapeCsvCell('-42.5')).toBe('-42.5');
    });

    it('generates RFC 4180 CSV with expected headers and timeseries rows', () => {
      const csv = buildLinkAnalyticsCsv(sampleAnalyticsData);
      const lines = csv.split('\r\n');

      expect(lines[0]).toBe(
        'Date,Clicks,Conversions,Volume,Currency,Total Views,Unique Visitors,Conversion Rate (%)'
      );
      expect(lines[1]).toBe('Aug 1,10,2,400,USDC,500,360,20');
      expect(lines[2]).toBe('"Aug 2, 2026",20,4,800,USDC,500,360,20');
    });
  });

  describe('LinkAnalytics component Export CSV action', () => {
    it('triggers a Blob CSV download with date-stamped filename when "Export CSV" is clicked', () => {
      const createObjectURLMock = jest.fn(() => 'blob:mock-csv-url');
      const revokeObjectURLMock = jest.fn();
      Object.assign(URL, {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      const clickSpy = jest
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(() => {});
      const appendSpy = jest.spyOn(document.body, 'appendChild');

      render(
        <LinkAnalytics
          views={500}
          uniquePayers={100}
          conversionRate={20}
          revenue={1200}
          currency="USDC"
          timeline={[
            { date: 'Aug 1', clicks: 10, conversions: 2, volume: 400 },
            { date: 'Aug 2', clicks: 20, conversions: 4, volume: 800 },
          ]}
        />
      );

      const exportBtn = screen.getByRole('button', { name: /export csv/i });
      fireEvent.click(exportBtn);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      const blobArg = (createObjectURLMock.mock.calls[0] as unknown[])[0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/csv;charset=utf-8;');

      expect(clickSpy).toHaveBeenCalledTimes(1);
      const anchorEl = appendSpy.mock.calls.find(
        ([node]) => (node as HTMLElement).tagName === 'A'
      )?.[0] as HTMLAnchorElement;
      expect(anchorEl).toBeDefined();
      expect(anchorEl.download).toMatch(/^link-analytics-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-csv-url');
    });
  });
});
