const VARIANTS = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
};

export default function StatusBadge({ status }) {
  return <span className={`badge ${VARIANTS[status] || "badge-neutral"}`}>{status}</span>;
}
