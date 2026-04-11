export const getStatusColor = (status) => {
  const colors = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    declined: "bg-red-100 text-red-800",
    rfq_created: "bg-purple-100 text-purple-800",
    stock_transfer_created: "bg-cyan-100 text-cyan-800",
    split_operation_created: "bg-blue-100 text-blue-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
};

export const getStatusBadgeStyles = (status) => {
  const styles = {
    draft: "bg-gray-100 text-gray-700 border border-gray-200",
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    declined: "bg-red-50 text-red-700 border border-red-200",
    rfq_created: "bg-purple-50 text-purple-700 border border-purple-200",
    stock_transfer_created: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    split_operation_created: "bg-blue-50 text-blue-700 border border-blue-200",
  };
  return styles[status] || "bg-gray-100 text-gray-700 border border-gray-200";
};

export const calculateKPIMetrics = (requests) => ({
  total: requests.length,
  pending: requests.filter(
    (r) => r.status === "pending" || r.status === "draft"
  ).length,
  approved: requests.filter((r) => 
    r.status === "rfq_created" || 
    r.status === "stock_transfer_created" || 
    r.status === "split_operation_created"
  ).length,
  rejected: requests.filter((r) => 
    r.status === "declined"
  ).length,
});
