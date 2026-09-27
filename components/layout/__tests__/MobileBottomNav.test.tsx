import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MobileBottomNav } from "../MobileBottomNav";
import i18n from "@/lib/i18n/config";

let mockPathname = "/dashboard";
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("MobileBottomNav i18n (#752)", () => {
  beforeEach(async () => {
    mockPathname = "/dashboard";
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  afterAll(async () => {
    await act(async () => {
      await i18n.changeLanguage("en");
    });
  });

  it("renders localized tab labels in default English", () => {
    render(<MobileBottomNav />);

    expect(screen.getByRole("navigation", { name: "Mobile primary navigation" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/payments");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/transactions");
    expect(screen.getByRole("link", { name: "Wallet" })).toHaveAttribute("href", "/wallet");
    expect(screen.getByRole("button", { name: "More navigation options" })).toHaveTextContent("More");
  });

  it("switches language to French immediately and updates all tab labels", async () => {
    render(<MobileBottomNav />);

    await act(async () => {
      await i18n.changeLanguage("fr");
    });

    expect(screen.getByRole("navigation", { name: "Navigation principale mobile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Paiements" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Historique" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portefeuille" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Plus d'options de navigation" })).toHaveTextContent("Plus");
  });

  it("switches language to Portuguese immediately and updates all tab labels", async () => {
    render(<MobileBottomNav />);

    await act(async () => {
      await i18n.changeLanguage("pt");
    });

    expect(screen.getByRole("navigation", { name: "Navegação principal móvel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Painel" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pagamentos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Histórico" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Carteira" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais opções de navegação" })).toHaveTextContent("Mais");
  });

  it("switches language to Swahili immediately and updates all tab labels", async () => {
    render(<MobileBottomNav />);

    await act(async () => {
      await i18n.changeLanguage("sw");
    });

    expect(screen.getByRole("navigation", { name: "Urambazaji mkuu wa simu" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashibodi" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Malipo" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Historia" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Pochi" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chaguo zaidi za urambazaji" })).toHaveTextContent("Zaidi");
  });

  it("marks active page with aria-current='page'", () => {
    mockPathname = "/payments";
    render(<MobileBottomNav />);

    const paymentsLink = screen.getByRole("link", { name: "Payments" });
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });

    expect(paymentsLink).toHaveAttribute("aria-current", "page");
    expect(dashboardLink).not.toHaveAttribute("aria-current");
  });

  it("hides the bottom nav on disallowed routes like /settings and /developers", () => {
    mockPathname = "/settings";
    const { container: settingsContainer } = render(<MobileBottomNav />);
    expect(settingsContainer).toBeEmptyDOMElement();

    mockPathname = "/developers";
    const { container: developersContainer } = render(<MobileBottomNav />);
    expect(developersContainer).toBeEmptyDOMElement();

    mockPathname = "/auth/login";
    const { container: authContainer } = render(<MobileBottomNav />);
    expect(authContainer).toBeEmptyDOMElement();
  });

  it("calls onMoreClick when More button is clicked", () => {
    const onMoreClick = jest.fn();
    render(<MobileBottomNav onMoreClick={onMoreClick} />);

    const moreButton = screen.getByRole("button", { name: "More navigation options" });
    fireEvent.click(moreButton);

    expect(onMoreClick).toHaveBeenCalledTimes(1);
  });
});
