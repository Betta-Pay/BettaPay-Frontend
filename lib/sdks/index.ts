export type SDKType = "server" | "client";

export const SDK_TYPE_LABELS: Record<SDKType, string> = {
  server: "Server-side SDK",
  client: "Client-side SDK",
};

export interface SDKDefinition {
  id: string;
  name: string;
  language: string;
  version: string;
  installCommand: string;
  githubUrl: string;
  docsUrl: string;
  status: "published" | "coming-soon";
  description: string;
  types: readonly SDKType[];
}

export const SDKS: readonly SDKDefinition[] = [
  {
    name: "TypeScript / JavaScript",
    language: "TypeScript",
    version: "0.1.0",
    installCommand: "npm install @bettapay/sdk",
    githubUrl: "https://github.com/betta-pay/bettapay-sdk",
    docsUrl: "https://docs.bettapay.com/sdks/typescript",
    status: "coming-soon",
    description:
      "Full-featured SDK for Node.js and browser environments. Supports payment links, transactions, and webhook verification.",
    id: "typescript",
    types: ["server", "client"],
  },
  {
    name: "Python",
    language: "Python",
    version: "0.1.0",
    installCommand: "pip install bettapay",
    githubUrl: "https://github.com/betta-pay/bettapay-python",
    docsUrl: "https://docs.bettapay.com/sdks/python",
    status: "coming-soon",
    description:
      "Pythonic SDK with async support. Ideal for Django, Flask, and FastAPI integrations.",
    id: "python",
    types: ["server"],
  },
  {
    name: "PHP",
    language: "PHP",
    version: "0.1.0",
    installCommand: "composer require bettapay/sdk",
    githubUrl: "https://github.com/betta-pay/bettapay-php",
    docsUrl: "https://docs.bettapay.com/sdks/php",
    status: "coming-soon",
    description:
      "Composer package for Laravel, Symfony, and plain PHP projects. PSR-compliant with full type hints.",
    id: "php",
    types: ["server"],
  },
  {
    name: "Go",
    language: "Go",
    version: "0.1.0",
    installCommand: "go get github.com/betta-pay/bettapay-go",
    githubUrl: "https://github.com/betta-pay/bettapay-go",
    docsUrl: "https://docs.bettapay.com/sdks/go",
    status: "coming-soon",
    description:
      "Idiomatic Go client with context support. Built for microservices and high-performance backend systems.",
    id: "go",
    types: ["server"],
  },
  {
    name: "Rust",
    language: "Rust",
    version: "0.1.0",
    installCommand: "cargo add bettapay",
    githubUrl: "https://github.com/betta-pay/bettapay-rs",
    docsUrl: "https://docs.bettapay.com/sdks/rust",
    status: "coming-soon",
    description:
      "Zero-cost abstraction SDK with async/await support. Designed for performance-critical payment processing.",
    id: "rust",
    types: ["server"],
  },
];
