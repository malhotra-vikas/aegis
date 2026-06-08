import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @aegis/db wraps the Prisma client + the node-postgres driver adapter, which
  // use Node built-ins and must not be bundled by the Server Components compiler.
  serverExternalPackages: [
    "@aegis/db",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
