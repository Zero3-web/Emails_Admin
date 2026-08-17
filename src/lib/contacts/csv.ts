export type ContactCsvRow = {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
};

const aliases: Record<keyof ContactCsvRow, string[]> = {
  email: ["email", "correo", "correo electronico", "e-mail"],
  firstName: ["nombre", "first name", "firstname"],
  lastName: ["apellido", "last name", "lastname"],
  company: ["empresa", "company", "compania"],
  phone: ["telefono", "phone", "celular"],
};

export function parseContactCsv(text: string): ContactCsvRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("El CSV debe incluir encabezados y al menos una fila.");
  const delimiter = count(lines[0], ";") > count(lines[0], ",") ? ";" : ",";
  const headers = parseLine(lines[0], delimiter).map(normalize);
  const column = (key: keyof ContactCsvRow) => headers.findIndex((header) => aliases[key].includes(header));
  const emailIndex = column("email");
  if (emailIndex < 0) throw new Error("No encontramos una columna Email o Correo.");

  return lines.slice(1).map((line) => {
    const cells = parseLine(line, delimiter);
    return {
      email: cells[emailIndex] ?? "",
      firstName: cells[column("firstName")] ?? "",
      lastName: cells[column("lastName")] ?? "",
      company: cells[column("company")] ?? "",
      phone: cells[column("phone")] ?? "",
    };
  });
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
