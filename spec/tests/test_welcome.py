"""End-to-end verification of the welcome page.

Boots the Uvicorn server in a subprocess and uses Playwright to assert the
functional verification criteria from ``specifications/Functional.md``:
server starts, ``/`` shows "hello world", text is centered, and a screenshot
is captured.
"""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest
from playwright.sync_api import Page, expect

HOST = "127.0.0.1"
PORT = 3000
URL = f"http://{HOST}:{PORT}/"
ARTIFACTS = Path(__file__).parent / "artifacts"


def _wait_for_port(host: str, port: int, timeout: float = 10.0) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.25)
            try:
                s.connect((host, port))
                return
            except OSError:
                time.sleep(0.1)
    raise RuntimeError(f"Server did not start on {host}:{port} within {timeout}s")


@pytest.fixture(scope="session", autouse=True)
def server():
    ARTIFACTS.mkdir(exist_ok=True)
    repo_root = Path(__file__).resolve().parent.parent
    proc = subprocess.Popen(
        [sys.executable, "-m", "app.server"],
        cwd=str(repo_root),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        env={**os.environ, "PYTHONUNBUFFERED": "1"},
    )
    try:
        _wait_for_port(HOST, PORT)
        yield
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def test_page_shows_hello_world(page: Page) -> None:
    page.goto(URL)
    h1 = page.locator("h1")
    expect(h1).to_have_text("hello world")


def test_text_is_blue(page: Page) -> None:
    page.goto(URL)
    color = page.locator("h1").evaluate("el => getComputedStyle(el).color")
    assert color == "rgb(0, 0, 255)", f"expected blue text, got {color}"


def test_text_is_centered(page: Page) -> None:
    page.goto(URL)
    viewport = page.viewport_size
    assert viewport is not None
    box = page.locator("h1").bounding_box()
    assert box is not None
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    assert abs(cx - viewport["width"] / 2) < 5, f"horizontal off: {cx} vs {viewport['width'] / 2}"
    assert abs(cy - viewport["height"] / 2) < 5, f"vertical off: {cy} vs {viewport['height'] / 2}"


def test_screenshot(page: Page) -> None:
    page.goto(URL)
    page.screenshot(path=str(ARTIFACTS / "welcome.png"), full_page=True)
    assert (ARTIFACTS / "welcome.png").exists()
