import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegisterPage from "../page";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

const mockNotify = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/lib/hooks/useNotify", () => ({ useNotify: () => mockNotify }));
jest.mock("@/lib/utils/announce", () => ({ announce: jest.fn() }));

const REAL_JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJtXzEiLCJyb2xlIjoibWVyY2hhbnQifQ.sig";

const json = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

let fetchMock: jest.Mock;

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Full Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email address"), " ada@example.com ");
  await user.type(screen.getByLabelText("Password"), "correct-horse");
  await user.type(screen.getByLabelText("Confirm Password"), "correct-horse");
  await user.click(screen.getByRole("button", { name: /Create Account/ }));
}

const callsTo = (suffix: string) =>
  fetchMock.mock.calls.filter(([url]) => String(url).endsWith(suffix));

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe("RegisterPage (issue #1128)", () => {
  it("opens the session with the JWT returned by the backend", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { data: { token: REAL_JWT } }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard"));
    const [[registerUrl, registerInit]] = callsTo("/api/auth/register");
    expect(String(registerUrl)).toMatch(/\/api\/auth\/register$/);
    expect(JSON.parse(registerInit.body)).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse",
    });
    const [[, sessionInit]] = callsTo("/api/auth/session");
    expect(JSON.parse(sessionInit.body)).toEqual({ token: REAL_JWT });
  });

  it("never sends a synthetic mock_jwt_register_ token", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { token: REAL_JWT }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalled());
    for (const [, init] of fetchMock.mock.calls) {
      expect(String(init?.body ?? "")).not.toContain("mock_jwt_register_");
    }
  });

  it("routes to sign in without creating a session when no token is returned", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { message: "Verification email sent" }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith("/auth/login?registered=1&email=ada%40example.com"),
    );
    expect(callsTo("/api/auth/session")).toHaveLength(0);
    expect(mockNotify.success).toHaveBeenCalledWith(expect.stringMatching(/verify/i));
  });

  it("shows the backend error and stays on the page when registration fails", async () => {
    fetchMock.mockResolvedValueOnce(json(409, { message: "Email taken" }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() =>
      expect(mockNotify.error).toHaveBeenCalledWith(expect.stringMatching(/already exists/)),
    );
    expect(callsTo("/api/auth/session")).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("sends the user to sign in if the session can't be opened", async () => {
    fetchMock
      .mockResolvedValueOnce(json(201, { accessToken: REAL_JWT }))
      .mockResolvedValueOnce(json(401, { ok: false }));
    render(<RegisterPage />);
    await fillAndSubmit();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/auth/login"));
    expect(mockNotify.error).toHaveBeenCalled();
  });
});
