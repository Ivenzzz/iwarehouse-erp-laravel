import axios from "axios";

export async function validateInventoryCSV({ file }) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(route("inventory.import.validate"), formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function importValidatedInventoryRows({ importToken }) {
  const response = await axios.post(route("inventory.import"), { importToken });
  return response.data;
}
