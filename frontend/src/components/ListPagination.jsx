/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';

// Keep the current page valid when filters or the underlying collection change.
export function useListPagination(items, resetKey = '') {
  const [state, setState] = useState({ page: 1, pageSize: 20, key: resetKey });
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  const page = state.key === resetKey ? Math.min(state.page, totalPages) : 1;
  useEffect(() => {
    setState((current) => {
      const nextPage = current.key === resetKey ? Math.min(current.page, totalPages) : 1;
      return current.key === resetKey && nextPage === current.page ? current : { ...current, page: nextPage, key: resetKey };
    });
  }, [resetKey, totalPages]);
  const start = (page - 1) * state.pageSize;
  return {
    items: items.slice(start, start + state.pageSize),
    page, totalPages, total: items.length, pageSize: state.pageSize,
    start: items.length ? start + 1 : 0,
    end: Math.min(start + state.pageSize, items.length),
    setPage: (next) => setState((current) => ({ ...current, page: next, key: resetKey })),
    setPageSize: (size) => setState({ page: 1, pageSize: size, key: resetKey }),
  };
}

export default function ListPagination({ pagination, label = 'kết quả' }) {
  const { page, totalPages, total, pageSize, start, end, setPage, setPageSize } = pagination;
  return <nav aria-label={`Phân trang ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
    <span aria-live="polite">Hiển thị {start}–{end} / {total} {label}</span>
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2">Mỗi trang <select aria-label={`Số ${label} mỗi trang`} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-2 py-1">{[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
      <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 disabled:opacity-40">Trước</button>
      <span>Trang {page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-1 disabled:opacity-40">Sau</button>
    </div>
  </nav>;
}
