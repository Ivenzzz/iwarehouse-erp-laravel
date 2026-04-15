function parseCSVLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseNum(value) {
  if (!value) return 0;
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ""));
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function parsePurchaseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return { headers: [], rows: [], error: "File must contain a header row and at least one data row." };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = parseCSVLine(lines[0], delimiter).map((header) => header.trim());
  const missingHeaders = ["Model", "Ram Capacity", "Rom Capacity", "Color", "Condition"].filter(
    (header) => !headers.some((candidate) => candidate.toLowerCase() === header.toLowerCase())
  );

  if (missingHeaders.length > 0) {
    return { headers: [], rows: [], error: `Missing required columns: ${missingHeaders.join(", ")}` };
  }

  const rows = [];
  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCSVLine(lines[index], delimiter);
    if (values.every((value) => !value.trim())) continue;

    const row = {};
    headers.forEach((header, headerIndex) => {
      row[header.trim()] = (values[headerIndex] || "").trim();
    });
    row._rowNum = index + 1;
    rows.push(row);
  }

  return { headers, rows, error: null };
}

export function validatePurchaseFileRows(rows, productMasters, variants) {
  const errors = [];
  const validatedRows = [];

  for (const row of rows) {
    const model = row.Model || "";
    const ramCapacity = row["Ram Capacity"] || "";
    const romCapacity = row["Rom Capacity"] || "";
    const color = row.Color || "";
    const condition = row.Condition || "";
    const rowNum = row._rowNum;
    const skuCode = row["SKU Code"] || "";
    const modelLower = model.toLowerCase().trim();
    const skuLower = skuCode.toLowerCase().trim();

    let productMaster = null;
    if (modelLower) productMaster = productMasters.find((entry) => entry.name?.toLowerCase().trim() === modelLower);
    if (!productMaster && modelLower) {
      productMaster = productMasters.find((entry) => {
        const name = entry.name?.toLowerCase().trim() || "";
        return name.includes(modelLower) || modelLower.includes(name);
      });
    }
    if (!productMaster && skuLower) {
      productMaster = productMasters.find((entry) => entry.master_sku?.toLowerCase().trim() === skuLower);
    }
    if (!productMaster && skuLower) {
      productMaster = productMasters.find((entry) => {
        const sku = entry.master_sku?.toLowerCase().trim() || "";
        return sku.includes(skuLower) || skuLower.includes(sku);
      });
    }

    if (!productMaster) {
      errors.push({
        row: rowNum,
        field: "Model",
        value: model || skuCode,
        message: `Product Master not found for Model="${model}"${skuCode ? ` or SKU="${skuCode}"` : ""}`,
      });
      continue;
    }

    const extractDigits = (value) => (value || "").toString().replace(/[^\d]/g, "");
    const normalizeCondition = (value) => (value || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const conditionMatches = (variantCondition, csvCondition) => {
      const variantConditionNormalized = normalizeCondition(variantCondition);
      if (variantConditionNormalized === csvCondition) return true;
      if (csvCondition === "preowned" && variantConditionNormalized === "certifiedpreowned") return true;
      if (csvCondition === "certifiedpreowned" && variantConditionNormalized === "preowned") return true;
      return csvCondition === "brandnew" && variantConditionNormalized === "brandnew";
    };

    const csvRamNum = extractDigits(ramCapacity);
    const csvRomNum = extractDigits(romCapacity);
    const csvColor = color.toLowerCase().trim();
    const csvConditionNormalized = normalizeCondition(condition);

    const matchingVariants = variants.filter((variant) => {
      if (variant.product_master_id !== productMaster.id) return false;
      const attrs = variant.attributes || {};
      const variantRamNum = extractDigits(attrs.RAM || attrs.ram || attrs["Ram Capacity"] || "");
      const variantRomNum = extractDigits(attrs.Storage || attrs.storage || attrs.ROM || attrs.rom || attrs["Rom Capacity"] || "");
      const variantColor = (attrs.Color || attrs.color || "").toString().toLowerCase().trim();
      return (
        (!csvRamNum || !variantRamNum || csvRamNum === variantRamNum) &&
        (!csvRomNum || !variantRomNum || csvRomNum === variantRomNum) &&
        (!csvColor || !variantColor || csvColor === variantColor) &&
        conditionMatches(variant.condition, csvConditionNormalized)
      );
    });

    if (matchingVariants.length === 0) {
      errors.push({
        row: rowNum,
        field: "Variant",
        value: `${model} | RAM: ${ramCapacity} | ROM: ${romCapacity} | Color: ${color} | Condition: ${condition}`,
        message: `No matching variant found for Model "${model}" with RAM="${ramCapacity}", ROM="${romCapacity}", Color="${color}", Condition="${condition}"`,
      });
      continue;
    }

    const variant = matchingVariants[0];
    validatedRows.push({
      _rowNum: rowNum,
      product_master_id: productMaster.id,
      variant_id: variant.id,
      product_name: productMaster.name,
      variant_name: variant.variant_name,
      condition: variant.condition || condition,
      serial_number: row["Serial Number"] || "",
      imei1: row["IMEI 1"] || row.Barcode || "",
      imei2: row["IMEI 2"] || "",
      imei3: row["IMEI 3"] || "",
      model_code: row["Model Code"] || "",
      sku_code: row["SKU Code"] || "",
      submodel: row.Submodel || "",
      ram_capacity: ramCapacity,
      ram_type: row["Ram Type"] || "",
      rom_capacity: romCapacity,
      rom_type: row["Rom Type"] || "",
      ram_slots: row["Ram Slots"] || "",
      color,
      sim_slot: row["Sim Slot"] || "",
      network_1: row["Network 1"] || "",
      network_2: row["Network 2"] || "",
      network_type: row["Network Type"] || "",
      product_type: row["Product Type"] || "",
      with_charger: row["With Charger"] || "",
      package: row.Package || "",
      code: row.Code || "",
      country_model: row["Country Model"] || "",
      cpu: row.CPU || "",
      gpu: row.GPU || "",
      os: row.OS || "",
      software: row.Software || "",
      resolution: row.Resolution || "",
      warranty: row.Warranty || "",
      cost_price: parseNum(row.Cost),
      cash_price: parseNum(row["Cash Price"]),
      srp: parseNum(row.SRP),
      "12_months_cc": parseNum(row["12 Months CC"]),
      "3_months_cc": parseNum(row["3 Months CC"]),
      dp_30: parseNum(row["DP 30%"]),
      intro: row.Intro || "",
      details: row.Details || "",
      product_details: row["Product Details"] || "",
    });
  }

  return { validatedRows, errors };
}
