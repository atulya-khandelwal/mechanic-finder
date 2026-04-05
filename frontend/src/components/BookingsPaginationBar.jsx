export const BOOKINGS_PAGE_SIZE = 8;

export default function BookingsPaginationBar({ page, totalItems, pageSize, onPageChange, ariaLabel = 'Pagination' }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);
  if (totalItems === 0) return null;
  return (
    <nav className="mws-jobs-pagination" aria-label={ariaLabel}>
      <p className="mws-jobs-pagination-meta mws-muted">
        {totalItems <= pageSize ? (
          <>Showing all {totalItems}</>
        ) : (
          <>
            Showing {start}–{end} of {totalItems}
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="mws-jobs-pagination-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
          >
            Previous
          </button>
          <span className="mws-jobs-pagination-status">
            Page {safePage} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </nav>
  );
}
