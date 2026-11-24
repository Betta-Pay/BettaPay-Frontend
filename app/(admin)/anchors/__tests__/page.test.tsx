import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminAnchorsPage from "../page";
import { apiClient } from "@/lib/api/axios";
import { toast } from "sonner";

jest.mock("@/lib/api/axios", () => ({
  apiClient: { get: jest.fn(), patch: jest.fn(), delete: jest.fn(), post: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

const api = apiClient as unknown as Record<"get" | "patch" | "delete" | "post", jest.Mock>;

// An id with characters that would break the path if interpolated raw.
const ANCHOR_ID = "anc/1?x=y#z";

const anchor = {
  id: ANCHOR_ID,
  name: "Cowry",
  code: "cowry",
  currency: "NGN",
  country: "Nigeria",
  flag: "🇳🇬",
  kycLevels: ["basic"],
  settlementTime: "Instant",
  protocols: [],
  websiteUrl: null,
  enabled: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  health: null,
  stats: null,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <AdminAnchorsPage />
    </QueryClientProvider>,
  );
}

const apiError = (message: string) =>
  Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status: 500, data: { message } },
  });

beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: [anchor] } });
  jest.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AdminAnchorsPage mutations (issue #1122)", () => {
  it("URL-encodes the anchor id when toggling", async () => {
    api.patch.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(await screen.findByLabelText("Enable/disable Cowry"));
    await waitFor(() =>
      expect(api.patch).toHaveBeenCalledWith(
        `/api/admin/anchors/${encodeURIComponent(ANCHOR_ID)}`,
        { enabled: false },
      ),
    );
  });

  it("URL-encodes the anchor id when deleting", async () => {
    api.delete.mockResolvedValue({ data: {} });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Remove Cowry" }));
    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith("/api/admin/anchors/anc%2F1%3Fx%3Dy%23z"),
    );
  });

  it("shows an error toast when a toggle fails", async () => {
    api.patch.mockRejectedValue(apiError("Anchor is locked"));
    renderPage();
    await userEvent.click(await screen.findByLabelText("Enable/disable Cowry"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to disable anchor", {
        description: "Anchor is locked",
      }),
    );
  });

  it("shows an error toast when a delete fails", async () => {
    api.delete.mockRejectedValue(apiError("Anchor has pending settlements"));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Remove Cowry" }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to delete anchor", {
        description: "Anchor has pending settlements",
      }),
    );
  });

  it("shows an error toast when creating an anchor fails", async () => {
    api.post.mockRejectedValue(apiError("Anchor code already exists"));
    renderPage();
    await screen.findByLabelText("Enable/disable Cowry");
    await userEvent.click(screen.getByRole("button", { name: /Add Anchor/ }));
    const form = (await screen.findByRole("dialog")).querySelector("form")!;
    fireEvent.submit(form);
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to create anchor", {
        description: "Anchor code already exists",
      }),
    );
  });
});
