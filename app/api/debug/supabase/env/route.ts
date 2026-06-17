export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    vercelEnv: process.env.VERCEL_ENV || null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID || null,

    hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),

    supabaseRelatedKeys: Object.keys(process.env)
      .filter((key) => key.toUpperCase().includes("SUPABASE"))
      .sort(),
  });
}