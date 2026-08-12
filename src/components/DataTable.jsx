import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Generic table shell used by every Master page.
 * Renders a scrollable table on md+ screens and a stacked card list on
 * mobile, plus a shared pagination footer.
 */
export default function DataTable({
  headers,
  data,
  renderRow,
  renderCard,
  minWidth = '600px',
  currentPage,
  totalPages,
  itemsPerPage,
  totalResults,
  onPageChange,
  onItemsPerPageChange,
}) {
  const safeTotalPages = totalPages || 1;
  const startIndex = totalResults === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalResults);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Desktop / tablet table view */}
      <div className="hidden md:block flex-1 min-h-0 overflow-auto">
        <table className="w-full" style={{ minWidth }}>
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length > 0 ? (
              data.map(renderRow)
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-gray-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden flex-1 min-h-0 overflow-auto p-2 space-y-2">
        {data.length > 0 ? (
          data.map(renderCard)
        ) : (
          <div className="px-4 py-10 text-center text-sm text-gray-400">No records found</div>
        )}
      </div>

      {/* Pagination footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-100 px-4 py-2.5 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2 text-[11px] text-gray-500">
          <span>Rows per page:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-200 rounded px-1.5 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {[10, 15, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        <div className="text-[11px] text-gray-500">
          {totalResults === 0 ? '0 results' : `${startIndex}–${endIndex} of ${totalResults}`}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-[11px] text-gray-600 px-1">
            Page {totalResults === 0 ? 0 : currentPage} of {safeTotalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(safeTotalPages, currentPage + 1))}
            disabled={currentPage >= safeTotalPages}
            className="p-1.5 rounded border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
