import dotenvFlow from "dotenv-flow";
import { defineConfig } from "prisma/config";

dotenvFlow.config();

const databaseUrl = () => {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const user = encodeURIComponent(process.env.DB_USER || "root");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "3306";
  const name = process.env.DB_NAME || "auth_system";
  return `mysql://${user}:${password}@${host}:${port}/${name}`;
};

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl(),
  },
});

