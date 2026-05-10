"""Uvicorn entrypoint for the hello-world app.

Binds to the loopback interface only and disables the ``Server`` response
header for a slightly hardened default. Run with::

    python -m app.server
"""

import uvicorn


def main() -> None:
    """Start the Uvicorn server on 127.0.0.1:3000."""
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=3000,
        server_header=False,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
