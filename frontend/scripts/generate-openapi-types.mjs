import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The frontend intentionally generates from a checked-in schema snapshot so
// local builds and CI do not depend on a running backend process.
const specPath = path.resolve(__dirname, "../../backend/openapi.json");
const outputPath = path.resolve(__dirname, "../src/api/generated/openapi.ts");

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const schemas = spec.components?.schemas ?? {};

function refName(ref) {
  return ref.split("/").at(-1);
}

function unwrapNullable(schema) {
  if (!schema || !Array.isArray(schema.anyOf)) {
    return { schema, nullable: false };
  }

  // FastAPI commonly emits nullable values as `anyOf: [<type>, null]`.
  const nonNullOptions = schema.anyOf.filter((item) => item.type !== "null");
  const hasNull = nonNullOptions.length !== schema.anyOf.length;

  if (nonNullOptions.length === 1) {
    return { schema: nonNullOptions[0], nullable: hasNull };
  }

  return { schema, nullable: false };
}

function toType(schema) {
  const { schema: unwrappedSchema, nullable } = unwrapNullable(schema);
  const baseType = renderType(unwrappedSchema);
  return nullable ? `${baseType} | null` : baseType;
}

function renderType(schema) {
  if (!schema) {
    return "unknown";
  }

  if (schema.$ref) {
    return refName(schema.$ref);
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((value) => JSON.stringify(value)).join(" | ");
  }

  if (schema.type === "array") {
    return `${toType(schema.items)}[]`;
  }

  if (schema.type === "object" || schema.properties) {
    const properties = schema.properties ?? {};
    const required = new Set(schema.required ?? []);
    const propertyLines = Object.entries(properties).map(([name, propertySchema]) => {
      const optionalMark = required.has(name) ? "" : "?";
      return `  ${JSON.stringify(name)}${optionalMark}: ${toType(propertySchema)};`;
    });

    if (propertyLines.length === 0) {
      return "Record<string, never>";
    }

    return `{\n${propertyLines.join("\n")}\n}`;
  }

  if (schema.type === "string") {
    return "string";
  }

  if (schema.type === "integer" || schema.type === "number") {
    return "number";
  }

  if (schema.type === "boolean") {
    return "boolean";
  }

  return "unknown";
}

const output = [
  "/* eslint-disable */",
  "// This file is generated from backend/openapi.json.",
  "// Run `pnpm generate:api` from frontend/ after backend contract changes.",
  "",
];

for (const [name, schema] of Object.entries(schemas)) {
  output.push(`export type ${name} = ${renderType(schema)};`, "");
}

writeFileSync(outputPath, `${output.join("\n").trimEnd()}\n`, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputPath)} from ${path.relative(process.cwd(), specPath)}`);
