import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SDKS } from "@/lib/sdks";
import {
  SDKCard,
  formatPackageManagerInstall,
  PACKAGE_MANAGER_STORAGE_KEY,
} from "../SDKCard";

describe("SDKCard — Package manager tab switcher (#897)", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("formats npm install commands for npm, yarn, pnpm, and bun", () => {
    expect(formatPackageManagerInstall("npm install @bettapay/sdk", "npm")).toBe(
      "npm install @bettapay/sdk",
    );
    expect(formatPackageManagerInstall("npm install @bettapay/sdk", "yarn")).toBe(
      "yarn add @bettapay/sdk",
    );
    expect(formatPackageManagerInstall("npm install @bettapay/sdk", "pnpm")).toBe(
      "pnpm add @bettapay/sdk",
    );
    expect(formatPackageManagerInstall("npm install @bettapay/sdk", "bun")).toBe(
      "bun add @bettapay/sdk",
    );
    expect(formatPackageManagerInstall("pip install bettapay", "pnpm")).toBe(
      "pip install bettapay",
    );
  });

  it("switches between npm, yarn, pnpm, and bun tabs and copies the selected command", () => {
    const tsSdk = SDKS.find((s) => s.id === "typescript")!;
    render(<SDKCard sdk={tsSdk} />);

    expect(screen.getByText("npm install @bettapay/sdk")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "pnpm" }));
    expect(screen.getByText("pnpm add @bettapay/sdk")).toBeInTheDocument();
    expect(window.localStorage.getItem(PACKAGE_MANAGER_STORAGE_KEY)).toBe("pnpm");

    fireEvent.click(screen.getByRole("tab", { name: "bun" }));
    expect(screen.getByText("bun add @bettapay/sdk")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copy typescript install command/i });
    fireEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("bun add @bettapay/sdk");
  });
});
