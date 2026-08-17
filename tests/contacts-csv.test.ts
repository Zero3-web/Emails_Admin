import assert from "node:assert/strict";
import test from "node:test";
import { parseContactCsv } from "../src/lib/contacts/csv";

test("parseContactCsv maps Spanish headers and semicolon delimiters", () => {
  const rows = parseContactCsv("Correo;Nombre;Apellido;Empresa;Teléfono\na@example.com;Ana;Pérez;ACME;999");
  assert.deepEqual(rows, [{ email: "a@example.com", firstName: "Ana", lastName: "Pérez", company: "ACME", phone: "999" }]);
});

test("parseContactCsv supports quoted delimiters", () => {
  const rows = parseContactCsv('email,company\na@example.com,"ACME, Inc."');
  assert.equal(rows[0].company, "ACME, Inc.");
});

test("parseContactCsv requires an email column", () => {
  assert.throws(() => parseContactCsv("nombre,empresa\nAna,ACME"), /Email o Correo/);
});
