import fs from "fs";
import path from "path";

const schemaDir = path.join(process.cwd(), "prisma", "schemas");
const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith(".prisma"));

let merged = "";
for (const file of schemaFiles) {
  merged += fs.readFileSync(path.join(schemaDir, file), "utf-8") + "\n";
}

const base = `
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
`;

fs.writeFileSync(path.join(process.cwd(), "prisma", "schema.prisma"), base + "\n" + merged);
console.log("✅ schema.prisma generated successfully");
