export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2?: R2Bucket; // stretch goal: logo uploads
  ENVIRONMENT?: string;
}
