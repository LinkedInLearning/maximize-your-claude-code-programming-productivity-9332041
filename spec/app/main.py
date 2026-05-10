"""FastAPI hello-world application.

Serves a single page at ``/`` rendering the text "hello world" centered on a
white background in blue (``#0000FF``). The page is intentionally accessible
(semantic ``<h1>``, ``lang`` attribute, document title, AAA contrast ratio).
"""

from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Hello World", docs_url=None, redoc_url=None, openapi_url=None)

_PAGE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Hello World</title>
    <style>
      html, body { height: 100%; margin: 0; background: #ffffff; }
      body { display: flex; align-items: center; justify-content: center;
             font-family: system-ui, -apple-system, sans-serif; }
      h1 { color: #0000FF; margin: 0; font-size: 3rem; }
    </style>
  </head>
  <body>
    <h1>hello world</h1>
  </body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def welcome() -> HTMLResponse:
    """Render the welcome page.

    Returns:
        HTMLResponse: A static HTML document displaying "hello world"
        centered horizontally and vertically, with blue text on a white
        background.
    """
    return HTMLResponse(content=_PAGE)
