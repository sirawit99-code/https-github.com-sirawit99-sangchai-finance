export async function GET() {
  return Response.json({
    ok: true,
    authConfigured: Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    checkedAt: new Date().toISOString(),
  });
}
