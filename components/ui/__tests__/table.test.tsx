import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Table,
  TableHeader,
  TableBody,
  VirtualizedTableBody,
  TableRow,
  TableHead,
  TableCell,
  calculateVirtualWindow,
} from "@/components/ui/table";

const MOCK_ROWS = Array.from({ length: 1000 }, (_, i) => ({
  id: `tx-${i}`,
  label: `Transaction #${i}`,
  amount: `$${(i + 1) * 10}.00`,
}));

describe("Table virtualization (Issue #874)", () => {
  it("renders all rows normally when virtualized is false (default)", () => {
    const smallDataset = MOCK_ROWS.slice(0, 20);
    const { container } = render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {smallDataset.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.label}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    const renderedBodyRows = container.querySelectorAll(
      'tbody [data-slot="table-row"]'
    );
    expect(renderedBodyRows.length).toBe(20);
  });

  it("mounts only the visible window of DOM rows for 1,000 rows when virtualized is enabled and updates on scroll", () => {
    const { container } = render(
      <Table virtualized rowHeight={40} maxHeight={200} overscan={2}>
        <TableHeader>
          <TableRow>
            <TableHead>Transaction</TableHead>
            <TableHead>Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {MOCK_ROWS.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.label}</TableCell>
              <TableCell>{row.amount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

    // 200px viewport / 40px rowHeight = 5 visible rows + 2 overscan = 7 rows mounted initially
    const initialBodyRows = container.querySelectorAll(
      'tbody [data-slot="table-row"]'
    );
    expect(initialBodyRows.length).toBe(7);
    expect(screen.getByText("Transaction #0")).toBeInTheDocument();
    expect(screen.getByText("Transaction #6")).toBeInTheDocument();
    expect(screen.queryByText("Transaction #500")).not.toBeInTheDocument();

    // Scroll down to 4000px (index 100)
    const scrollContainer = container.querySelector(
      '[data-slot="table-container"]'
    ) as HTMLDivElement;
    Object.defineProperty(scrollContainer, "scrollTop", {
      value: 4000,
      writable: true,
    });
    Object.defineProperty(scrollContainer, "clientHeight", {
      value: 200,
      writable: true,
    });
    fireEvent.scroll(scrollContainer);

    // At scrollTop 4000 (row 100): startIndex = 98, endIndex = 107 (9 rows)
    const scrolledBodyRows = container.querySelectorAll(
      'tbody [data-slot="table-row"]'
    );
    expect(scrolledBodyRows.length).toBe(9);
    expect(screen.queryByText("Transaction #0")).not.toBeInTheDocument();
    expect(screen.getByText("Transaction #100")).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="table-virtual-spacer-top"]')
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="table-virtual-spacer-bottom"]')
    ).toBeInTheDocument();
  });

  it("supports VirtualizedTableBody render-prop helper for 1,000 items", () => {
    const { container } = render(
      <Table virtualized rowHeight={50} maxHeight={250} overscan={3}>
        <VirtualizedTableBody
          items={MOCK_ROWS}
          renderRow={(row) => (
            <TableRow key={row.id}>
              <TableCell>{row.label}</TableCell>
            </TableRow>
          )}
        />
      </Table>
    );

    // 250 / 50 = 5 visible + 3 overscan = 8 rows
    const renderedRows = container.querySelectorAll(
      'tbody [data-slot="table-row"]'
    );
    expect(renderedRows.length).toBe(8);
    expect(screen.getByText("Transaction #0")).toBeInTheDocument();
    expect(screen.queryByText("Transaction #999")).not.toBeInTheDocument();
  });

  it("calculates virtual window boundaries accurately", () => {
    const windowResult = calculateVirtualWindow({
      count: 1000,
      rowHeight: 40,
      viewportHeight: 200,
      scrollTop: 2000,
      overscan: 2,
    });

    expect(windowResult.startIndex).toBe(48);
    expect(windowResult.endIndex).toBe(57);
    expect(windowResult.topPadding).toBe(48 * 40);
    expect(windowResult.bottomPadding).toBe((1000 - 57) * 40);
    expect(windowResult.totalSize).toBe(40000);
  });
});
