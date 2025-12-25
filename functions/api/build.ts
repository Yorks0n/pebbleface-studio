export async function onRequest(context: any) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const runnerOrigin = env.RUNNER_ORIGIN; // e.g. https://build.pebbleface.com
  if (!runnerOrigin) {
    return new Response("Missing RUNNER_ORIGIN", { status: 500 });
  }

  const upstreamUrl = runnerOrigin.replace(/\/$/, "") + "/build";

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        // Forward token if configured
        ...(env.RUNNER_TOKEN ? { "X-Runner-Token": env.RUNNER_TOKEN } : {}),
        // Do not set Content-Type for multipart; fetch handles boundary automatically when body is passed
      },
      body: request.body,
    });

    const headers = new Headers(upstream.headers);
    // Allow frontend to read key headers
    headers.set(
      "Access-Control-Expose-Headers",
      "Content-Disposition,X-Job-Id,X-Build-Log-Base64,Retry-After"
    );

    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (err: any) {
     return new Response(JSON.stringify({ ok: false, error: "Upstream connection failed", detail: err.message }), { 
         status: 502,
         headers: { "Content-Type": "application/json" }
     });
  }
}
