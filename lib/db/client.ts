import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.avtilhvzkzsvxpbvukqx:9zBZi%40KA%2FeJ%40D3k@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require";

// Disable prefetch for transaction pool mode and cap connections per lambda
const client = postgres(connectionString, { prepare: false, max: 1 });

export const db = drizzle(client, { schema });
export { schema };
