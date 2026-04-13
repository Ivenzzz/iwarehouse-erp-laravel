export const getStatusBadgeStyles = (status) => {
  const styles = {
    pending: "bg-amber-50 text-amber-700 border border-amber-200",
    declined: "bg-red-50 text-red-700 border border-red-200",
    rfq_created: "bg-purple-50 text-purple-700 border border-purple-200",
    stock_transfer_created: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    split_operation_created: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  return styles[status] || "bg-gray-100 text-gray-700 border border-gray-200";
};
