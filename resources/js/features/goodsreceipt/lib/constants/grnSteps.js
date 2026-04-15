import { CheckCircle2, ClipboardCheck, PackageCheck, ShieldAlert } from "lucide-react";

export const GRN_STEPS = [
  {
    id: "validate-duplicates",
    label: "Validating duplicates",
    detail: "Checking IMEI/serial records before GRN submission.",
    icon: ShieldAlert,
  },
  {
    id: "create-grn",
    label: "Creating GRN",
    detail: "Saving goods receipt and received unit details.",
    icon: ClipboardCheck,
  },
  {
    id: "finalize-dr",
    label: "Finalizing delivery receipt",
    detail: "Marking source delivery receipt as encoded/completed.",
    icon: PackageCheck,
  },
  {
    id: "done",
    label: "Done",
    detail: "Goods receipt process finished successfully.",
    icon: CheckCircle2,
  },
];
