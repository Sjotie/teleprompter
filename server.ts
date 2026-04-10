import { file } from "bun"
import { join, extname } from "node:path"

const DIST = join(import.meta.dir, "dist")
const INDEX = join(DIST, "index.html")
const PORT = Number(process.env.PORT ?? 3000)

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
}

async function serve(pathname: string): Promise<Response> {
  const safePath = pathname.replace(/\?.*$/, "").replace(/^\/+/, "")
  const candidate = safePath ? join(DIST, safePath) : INDEX

  // Block path traversal.
  if (!candidate.startsWith(DIST)) {
    return new Response("Forbidden", { status: 403 })
  }

  const f = file(candidate)
  if (await f.exists()) {
    const ext = extname(candidate).toLowerCase()
    const type = MIME[ext] ?? "application/octet-stream"
    return new Response(f, { headers: { "content-type": type } })
  }

  // SPA fallback.
  return new Response(file(INDEX), {
    headers: { "content-type": "text/html; charset=utf-8" },
  })
}

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    return serve(url.pathname)
  },
})

console.log(`teleprompter serving http://0.0.0.0:${PORT}`)
