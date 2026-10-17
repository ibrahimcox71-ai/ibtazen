import { formatMoneyMinor } from "@/lib/admin/labels";
import type { ProposalLine } from "@ibtatech/leads";

/**
 * Commercial line items for portal detail views — read-only rendering of
 * the server-stored snapshot (integer minor units, no recalculation).
 */
export function LineItems({ lines, currency }: { lines: ProposalLine[]; currency: string }) {
  if (lines.length === 0) {
    return <p className="text-sm text-text-muted">No line items on this document.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-sm w-full min-w-[480px] text-left">
        <thead className="text-xs tracking-wide border-b border-border-subtle bg-surface-sunken text-text-muted uppercase">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Description
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-right">
              Qty
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-right">
              Unit price
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-right">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {lines.map((line, index) => (
            <tr key={`${index}-${line.description}`}>
              <td className="px-4 py-3 text-text">{line.description}</td>
              <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                {line.quantity}
              </td>
              <td className="px-4 py-3 text-right text-text-secondary tabular-nums">
                {formatMoneyMinor(line.unitPriceMinor, currency)}
              </td>
              <td className="px-4 py-3 text-right text-text tabular-nums" data-testid="line-total">
                {formatMoneyMinor(line.quantity * line.unitPriceMinor, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
