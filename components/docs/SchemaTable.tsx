import { Fragment } from 'react';
import { cn } from '@/lib/utils';
import type { SchemaField } from '@/lib/docs/types';

interface SchemaTableProps {
  fields: SchemaField[];
  className?: string;
}

/** Render a field row and, recursively, any nested child fields (indented). */
function FieldRows({ fields, depth }: { fields: SchemaField[]; depth: number }) {
  return (
    <>
      {fields.map((field, index) => (
        <Fragment key={`${depth}-${field.name}-${index}`}>
          <tr className="border-t border-border align-top">
            <td className="py-2.5 pr-4">
              <div
                className="flex items-center gap-2"
                style={{ paddingLeft: depth > 0 ? depth * 16 : undefined }}
              >
                {depth > 0 && (
                  <span className="text-muted-foreground/50" aria-hidden="true">
                    └
                  </span>
                )}
                <code className="font-mono text-xs font-medium text-foreground">{field.name}</code>
              </div>
            </td>
            <td className="py-2.5 pr-4">
              <code className="font-mono text-xs text-primary">{field.type}</code>
            </td>
            <td className="py-2.5 pr-4">
              <span
                className={cn(
                  'text-xs font-medium',
                  field.required ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {field.required ? 'Yes' : 'No'}
              </span>
            </td>
            <td className="py-2.5 pr-4 text-xs leading-relaxed text-muted-foreground">
              {field.description}
              {field.example !== undefined && (
                <div className="mt-1">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                    {field.example}
                  </code>
                </div>
              )}
            </td>
          </tr>
          {field.children && field.children.length > 0 && (
            <FieldRows fields={field.children} depth={depth + 1} />
          )}
        </Fragment>
      ))}
    </>
  );
}

/**
 * Request/response schema table with Field / Type / Required / Description
 * columns. Nested object and array-element fields are indented under their
 * parent. Pure component — renders on the server.
 */
export function SchemaTable({ fields, className }: SchemaTableProps) {
  if (fields.length === 0) return null;

  return (
    <div className={cn('overflow-x-auto rounded-xl border border-border', className)}>
      <table className="w-full min-w-[560px] border-collapse text-left">
        <thead>
          <tr className="bg-muted/40">
            <th className="py-2.5 pl-4 pr-4 text-xs font-semibold text-muted-foreground">Field</th>
            <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Type</th>
            <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Required</th>
            <th className="py-2.5 pr-4 text-xs font-semibold text-muted-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td:first-child]:pl-4">
          <FieldRows fields={fields} depth={0} />
        </tbody>
      </table>
    </div>
  );
}
