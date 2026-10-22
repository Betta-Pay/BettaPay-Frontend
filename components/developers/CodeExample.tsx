"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Button } from '@/components/ui';
import { Code2, Copy, Check } from 'lucide-react';
import { codeSnippets, type Language, type Operation } from './codeSnippets';
import { SyntaxHighlighter } from './SyntaxHighlighter';

const LANGUAGES: Language[] = ['javascript', 'python', 'php', 'go'];
const OPERATIONS: Operation[] = ['create-payment-link', 'list-transactions', 'initiate-settlement', 'get-fx-quote'];

interface CodeExampleProps {
  onCopy: (code: string) => void;
}

export function CodeExample({ onCopy }: CodeExampleProps) {
  const [language, setLanguage] = useState<Language>('javascript');
  const [operation, setOperation] = useState<Operation>('create-payment-link');
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState('');

  useEffect(() => {
    const snippet = codeSnippets[operation][language];
    setCode(snippet);
  }, [language, operation]);

  const handleCopy = async () => {
    onCopy(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const operationLabels: Record<Operation, string> = {
    'create-payment-link': 'Create Payment Link',
    'list-transactions': 'List Transactions',
    'initiate-settlement': 'Initiate Settlement',
    'get-fx-quote': 'Get FX Quote',
  };

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
            <Code2 className="w-4 h-4 text-primary" /> Code Example
          </CardTitle>
          <Button
            variant="outline"
            className="border-border rounded-xl h-8 px-3 text-xs"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 mr-1.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-1.5" /> Copy
              </>
            )}
          </Button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Operation Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Operation
            </label>
            <div className="flex flex-wrap gap-2">
              {OPERATIONS.map((op) => (
                <Button
                  key={op}
                  variant={operation === op ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs rounded-lg"
                  onClick={() => setOperation(op)}
                >
                  {operationLabels[op]}
                </Button>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">
              Language
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((lang) => (
                <Button
                  key={lang}
                  variant={language === lang ? 'default' : 'outline'}
                  className="h-7 px-2.5 text-xs rounded-lg capitalize"
                  onClick={() => setLanguage(lang)}
                >
                  {lang}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <SyntaxHighlighter code={code} language={language} />
      </CardContent>
    </Card>
  );
}
