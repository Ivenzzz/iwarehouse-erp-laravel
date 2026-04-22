import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useMemo } from "react";

export function usePOSData() {
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["inventory"],
    queryFn: () => base44.entities.Inventory.list(),
    initialData: [],
  });

  const { data: productMasters = [] } = useQuery({
    queryKey: ["productMasters"],
    queryFn: () => base44.entities.ProductMaster.list(),
    initialData: [],
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["variants"],
    queryFn: () => base44.entities.ProductVariant.list(),
    initialData: [],
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: () => base44.entities.ProductBrand.list(),
    initialData: [],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => base44.entities.ProductCategory.list(),
    initialData: [],
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => base44.entities.Warehouse.list(),
    initialData: [],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date"),
    initialData: [],
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
    initialData: [],
  });

  const { data: paymentTypes = [] } = useQuery({
    queryKey: ["paymentTypes"],
    queryFn: () => base44.entities.PaymentType.list(),
    initialData: [],
  });

  const { data: companyInfo = [] } = useQuery({
    queryKey: ["companyInfo"],
    queryFn: () => base44.entities.CompanyInfo.list(),
    initialData: [],
  });

  const { data: promotions = [] } = useQuery({
    queryKey: ["promotions"],
    queryFn: () => base44.entities.Promotion.filter({ is_active: true }),
    initialData: [],
  });

  const customerOptions = useMemo(() => {
    return customers.map((cust) => ({
      value: cust.id,
      label: `${cust.full_name} - ${cust.phone}`,
      searchString: `${cust.full_name} ${cust.phone} ${cust.email || ""} ${cust.customer_code || ""}`.toLowerCase(),
    }));
  }, [customers]);

  const salesRepresentatives = useMemo(() => {
    return employees.filter((emp) => 
      emp.employment_info?.department === "sales" && emp.status === "Active"
    );
  }, [employees]);

  const salesRepOptions = useMemo(() => {
    return salesRepresentatives.map((rep) => {
      const name = rep.personal_info?.full_name || rep.employee_code;
      const position = rep.employment_info?.position;
      return {
        value: rep.id,
        label: position ? `${name} - ${position}` : name,
        searchString: `${name} ${rep.employee_code || ""} ${position || ""}`.toLowerCase(),
        warehouseId: rep.employment_info?.warehouse_id,
      };
    });
  }, [salesRepresentatives]);

  const cashPaymentTypeId = useMemo(() => {
    const cashPayment = paymentTypes.find((pt) => pt.name?.toLowerCase() === "cash");
    return cashPayment?.id || "";
  }, [paymentTypes]);

  const taxRate = useMemo(() => companyInfo[0]?.tax_rate || 0, [companyInfo]);

  return {
    currentUser,
    inventory,
    productMasters,
    variants,
    brands,
    categories,
    warehouses,
    customers,
    employees,
    paymentTypes,
    companyInfo,
    promotions,
    customerOptions,
    salesRepresentatives,
    salesRepOptions,
    cashPaymentTypeId,
    taxRate,
  };
}