import { useState, useCallback } from "react";
import { ADD_PURCHASE_STEPS as STEPS } from "../constants/addPurchaseSteps";
import {
  executeDirectPurchaseImport,
  validateCSVOnServer,
  resolveConflictsOnServer,
} from "../services/goodsReceiptService";

function resolveUserDisplayName(currentUser) {
  return (
    currentUser?.full_name ||
    [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ").trim() ||
    currentUser?.name ||
    currentUser?.email ||
    currentUser?.id ||
    ""
  );
}

function createInitialFormData(currentUser) {
  const now = new Date().toISOString();
  return {
    supplierId: "",
    arrivalDate: now,
    dateEncoded: now,
    encodedBy: resolveUserDisplayName(currentUser),
    drNumber: "",
    drDocumentUrl: "",
    waybillUrl: "",
    trackingNumber: "",
    purchaseFileUrl: "",
    purchaseFile: null,
  };
}

export function useAddPurchase({ mainWarehouse, currentUser, refreshPage }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(STEPS.FORM);
  const [formData, setFormData] = useState(() => createInitialFormData(currentUser));
  const [validatedRows, setValidatedRows] = useState([]);
  const [brandConflicts, setBrandConflicts] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [duplicateErrors, setDuplicateErrors] = useState([]);
  const [importResult, setImportResult] = useState(null);

  const reset = useCallback(() => {
    setStep(STEPS.FORM);
    setFormData(createInitialFormData(currentUser));
    setValidatedRows([]);
    setBrandConflicts([]);
    setValidationErrors([]);
    setDuplicateErrors([]);
    setImportResult(null);
  }, [currentUser]);

  const openDialog = useCallback(() => {
    reset();
    setOpen(true);
  }, [reset]);

  const closeDialog = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  const updateFormData = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const normalizeModelKey = useCallback((value) => (
    (value || "").toString().trim().toLowerCase().replace(/\s+/g, " ")
  ), []);

  const buildGroupedConflictMeta = useCallback((conflicts) => {
    const grouped = conflicts.reduce((acc, conflict, index) => {
      const key = normalizeModelKey(conflict?.normalizedModelName || conflict?.modelName);
      if (!key) return acc;

      if (!acc[key]) {
        acc[key] = {
          indexes: [],
          brandIds: new Set(),
        };
      }

      acc[key].indexes.push(index);
      (conflict?.brands || []).forEach((brand) => {
        const brandId = (brand?.brandId || "").toString();
        if (brandId) acc[key].brandIds.add(brandId);
      });

      return acc;
    }, {});

    return Object.values(grouped).map((group) => ({
      indexes: group.indexes,
      brandIds: Array.from(group.brandIds),
    }));
  }, [normalizeModelKey]);

  const handleValidateCSV = useCallback(async (csvText) => {
    setStep(STEPS.VALIDATING);
    setValidationErrors([]);
    setDuplicateErrors([]);

    const { validatedRows: valid, errors, brandConflicts: conflicts } = await validateCSVOnServer(csvText);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setStep(STEPS.FORM);
      return;
    }

    if (conflicts.length > 0) {
      const groupedMeta = buildGroupedConflictMeta(conflicts);
      const canAutoResolve =
        groupedMeta.length > 0 &&
        groupedMeta.every((group) => group.brandIds.length === 1);

      if (canAutoResolve) {
        const autoResolvedConflicts = conflicts.map((conflict) => ({ ...conflict }));

        groupedMeta.forEach((group) => {
          const selectedBrandId = group.brandIds[0];
          group.indexes.forEach((index) => {
            autoResolvedConflicts[index] = {
              ...autoResolvedConflicts[index],
              selectedBrandId,
            };
          });
        });

        const { resolved, errors: resolveErrors } = await resolveConflictsOnServer(autoResolvedConflicts);
        if (resolveErrors.length > 0) {
          setValidationErrors((prev) => [...prev, ...resolveErrors]);
          setStep(STEPS.FORM);
          return;
        }

        setValidatedRows([...valid, ...resolved]);
        setBrandConflicts([]);
        setStep(STEPS.PREVIEW);
        return;
      }

      setBrandConflicts(conflicts);
      setValidatedRows(valid);
      setStep(STEPS.BRAND_CONFLICTS);
      return;
    }

    setValidatedRows(valid);
    setStep(STEPS.PREVIEW);
  }, [buildGroupedConflictMeta]);

  const handleResolveConflicts = useCallback(async () => {
    setStep(STEPS.VALIDATING);
    const { resolved, errors } = await resolveConflictsOnServer(brandConflicts);

    if (errors.length > 0) {
      setValidationErrors((prev) => [...prev, ...errors]);
      setStep(STEPS.FORM);
      return;
    }

    setValidatedRows((prev) => [...prev, ...resolved]);
    setBrandConflicts([]);
    setStep(STEPS.PREVIEW);
  }, [brandConflicts]);

  const handleImport = useCallback(async () => {
    setStep(STEPS.IMPORTING);
    setDuplicateErrors([]);

    const result = await executeDirectPurchaseImport({ formData, validatedRows, mainWarehouse });
    if (result.duplicates) {
      setDuplicateErrors(result.duplicates);
      setStep(STEPS.PREVIEW);
      return;
    }

    setImportResult(result);
    setStep(STEPS.DONE);
    refreshPage();
  }, [formData, mainWarehouse, refreshPage, validatedRows]);

  return {
    open,
    setOpen,
    step,
    setStep,
    formData,
    updateFormData,
    validatedRows,
    brandConflicts,
    setBrandConflicts,
    validationErrors,
    duplicateErrors,
    importResult,
    openDialog,
    closeDialog,
    handleValidateCSV,
    handleResolveConflicts,
    handleImport,
    STEPS,
  };
}
