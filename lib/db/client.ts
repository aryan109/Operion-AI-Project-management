import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.avtilhvzkzsvxpbvukqx:9zBZi%40KA%2FeJ%40D3k@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require";

// Disable prefetch as it is not supported for "Transaction" pool mode if using pooler
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
