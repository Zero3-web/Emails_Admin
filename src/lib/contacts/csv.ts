import * as XLSX from "xlsx";

export type ContactCsvRow = {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
};

const aliases: Record<keyof ContactCsvRow, string[]> = {
  email: ["email", "correo", "correo electronico", "e-mail", "mail", "direccion de correo", "email address"],
  firstName: ["nombre", "first name", "firstname", "nombres", "given name"],
  lastName: ["apellido", "last name", "lastname", "apellidos", "family name", "surname"],
  company: ["empresa", "company", "compania", "razon social", "organizacion", "organization"],
  phone: ["telefono", "phone", "celular", "movil", "mobile", "whatsapp", "phone number"],
};

export async function parseContactFile(file: File): Promise<ContactCsvRow[]> {
  const name = file.name.toLowerCase();
  const isBinaryExcel = /\.(xlsx|xls|ods)$/i.test(name);

  if (isBinaryExcel) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error("El archivo de Excel no contiene hojas con datos.");
    const worksheet = workbook.Sheets[firstSheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" });

    if (!rawData.length) {
      throw new Error("El archivo de Excel está vacío o no tiene encabezados válidos.");
    }

    const firstRow = rawData[0];
    const rawHeaders = Object.keys(firstRow);
    const normalizedHeaders = rawHeaders.map(normalize);

    const findKeyIndex = (key: keyof ContactCsvRow) => {
      return normalizedHeaders.findIndex((h) => aliases[key].some((alias) => h === alias || h.includes(alias)));
    };

    const emailKeyIndex = findKeyIndex("email");
    if (emailKeyIndex < 0) {
      throw new Error("No encontramos una columna de Email o Correo en la hoja de Excel.");
    }

    const emailHeaderKey = rawHeaders[emailKeyIndex];
    const firstNameHeaderKey = rawHeaders[findKeyIndex("firstName")];
    const lastNameHeaderKey = rawHeaders[findKeyIndex("lastName")];
    const companyHeaderKey = rawHeaders[findKeyIndex("company")];
    const phoneHeaderKey = rawHeaders[findKeyIndex("phone")];

    const results: ContactCsvRow[] = [];
    for (const row of rawData) {
      const rawEmail = String(row[emailHeaderKey] ?? "").trim();
      if (!rawEmail || !rawEmail.includes("@")) continue;
      results.push({
        email: rawEmail,
        firstName: firstNameHeaderKey ? String(row[firstNameHeaderKey] ?? "").trim() || undefined : undefined,
        lastName: lastNameHeaderKey ? String(row[lastNameHeaderKey] ?? "").trim() || undefined : undefined,
        company: companyHeaderKey ? String(row[companyHeaderKey] ?? "").trim() || undefined : undefined,
        phone: phoneHeaderKey ? String(row[phoneHeaderKey] ?? "").trim() || undefined : undefined,
      });
    }
    return results;
  }

  const text = await file.text();
  return parseContactCsv(text);
}

export function parseContactCsv(text: string): ContactCsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("El archivo debe incluir encabezados y al menos una fila.");
  const delimiter = count(lines[0], ";") > count(lines[0], ",") ? ";" : ",";
  const headers = parseLine(lines[0], delimiter).map(normalize);
  const column = (key: keyof ContactCsvRow) => headers.findIndex((header) => aliases[key].some((alias) => header === alias || header.includes(alias)));
  const emailIndex = column("email");
  if (emailIndex < 0) throw new Error("No encontramos una columna de Email o Correo.");

  const results: ContactCsvRow[] = [];
  const fnCol = column("firstName");
  const lnCol = column("lastName");
  const compCol = column("company");
  const phCol = column("phone");

  for (const line of lines.slice(1)) {
    const cells = parseLine(line, delimiter);
    const emailVal = (cells[emailIndex] ?? "").trim();
    if (!emailVal || !emailVal.includes("@")) continue;
    results.push({
      email: emailVal,
      firstName: fnCol >= 0 ? cells[fnCol] || undefined : undefined,
      lastName: lnCol >= 0 ? cells[lnCol] || undefined : undefined,
      company: compCol >= 0 ? cells[compCol] || undefined : undefined,
      phone: phCol >= 0 ? cells[phCol] || undefined : undefined,
    });
  }
  return results;
}

function count(value: string, token: string) {
  return value.split(token).length - 1;
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function parseLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = "";
    } else current += char;
  }
  values.push(current.trim());
  return values;
}
