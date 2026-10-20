from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import os

import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response

# The app (TanStack Start, port 3000) serves its own API routes; ingress sends /api/* here, so forward them.
app = FastAPI()
UPSTREAM = os.environ["APP_UPSTREAM_URL"]
HOP = {"host", "connection", "keep-alive", "transfer-encoding", "content-length", "content-encoding", "upgrade"}


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def forward(path: str, request: Request):
    headers = {k: v for k, v in request.headers.items() if k.lower() not in HOP}
    headers["x-forwarded-host"] = request.headers.get("host", "")
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.request(
            request.method, f"{UPSTREAM}/api/{path}", params=request.query_params,
            content=await request.body(), headers=headers,
        )
    resp = Response(content=r.content, status_code=r.status_code)
    for k, v in r.headers.multi_items():
        if k.lower() not in HOP:
            resp.headers.append(k, v)
    return resp
