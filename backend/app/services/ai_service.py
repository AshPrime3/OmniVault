"""
OmniVault — AI service layer.
Mirrors the Node.js AI controller: Groq LLaMA 3 with rule-based fallback.
"""

import json
import logging
import re

import httpx

from app.config.settings import settings
from app.utils.fallback import (
    security_fallback, hint_fallback, build_security_badge, clamp, snap_expiry,
)

logger = logging.getLogger("omnivault")

GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


def _build_security_prompt(filename: str, size_bytes: int | None) -> str:
    size_mb = f"{size_bytes / (1024 * 1024):.2f}" if size_bytes else "unknown"
    return f"""Analyze this file for an encrypted vault and suggest secure sharing settings.

File name: "{filename}"
File size: {size_mb} MB

Respond ONLY with this exact JSON:
{{
  "sensitivity": "high" | "medium" | "low",
  "downloadLimit": <integer 1-50>,
  "expiresInMinutes": <one of: 15, 30, 60, 360, 1440, 10080>,
  "reason": "<one concise sentence explaining your choice>"
}}

Sensitivity guide:
- high: financial, legal, medical, identity, credentials (tax, passport, contract, salary, bank, ssn, kyc, id, health, medical, confidential, private, secret) → 1 download, 60 min
- low: casual media, memes, entertainment (meme, fun, cat, dog, photo, wallpaper, game, music) → 10 downloads, 10080 min (7 days)
- medium: everything else → 5 downloads, 1440 min (24 hours)"""


def _build_hint_prompt(passphrase: str) -> str:
    return f"""Create a cryptic, poetic, and memorable hint for this passphrase: "{passphrase}"

Rules:
- Do NOT include the passphrase or any of its words directly
- Keep it under 15 words
- Make it feel like a riddle or poem
- It should jog the memory of someone who already knows the passphrase"""


async def get_security_suggestion(filename: str, size_bytes: int | None) -> dict:
    """AI-powered security suggestion, with fallback."""
    groq_key = settings.GROQ_API_KEY

    if not groq_key:
        logger.warning("GROQ_API_KEY not set — using rule-based fallback for security suggestion")
        return security_fallback(filename, size_bytes)

    prompt = _build_security_prompt(filename, size_bytes)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a file security advisor for an encrypted file vault. Analyze filenames and sizes to recommend secure sharing settings. Always respond with valid JSON only — no markdown, no extra text.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.3,
                    "max_tokens": 200,
                },
            )

        if response.status_code != 200:
            logger.error(f"Groq API error (security-suggest): {response.text}")
            return security_fallback(filename, size_bytes)

        data = response.json()
        raw = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        # Extract JSON from response
        json_match = re.search(r"\{[\s\S]*\}", raw)
        if not json_match:
            logger.warning(f"Groq returned non-JSON for security-suggest: {raw}")
            return security_fallback(filename, size_bytes)

        parsed = json.loads(json_match.group())
        sensitivity = parsed.get("sensitivity", "medium")
        if sensitivity not in ("high", "medium", "low"):
            sensitivity = "medium"

        suggestion = {
            "sensitivity": sensitivity,
            "downloadLimit": clamp(int(parsed.get("downloadLimit", 5)), 1, 50),
            "expiresInMinutes": snap_expiry(int(parsed.get("expiresInMinutes", 1440))),
            "reason": parsed.get("reason", "AI analysis complete."),
            "badge": build_security_badge(sensitivity),
        }

        logger.info(f'AI security suggestion for "{filename}": {suggestion["sensitivity"]}')
        return suggestion

    except Exception as exc:
        logger.error(f"getSecuritySuggestion error: {exc}")
        return security_fallback(filename, size_bytes)


async def get_passphrase_hint(passphrase: str) -> dict:
    """AI-powered passphrase hint generator, with fallback."""
    groq_key = settings.GROQ_API_KEY

    if not groq_key:
        logger.warning("GROQ_API_KEY not set — using rule-based fallback for passphrase hint")
        return hint_fallback(passphrase)

    prompt = _build_hint_prompt(passphrase)

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "llama3-8b-8192",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a creative security hint writer. Given a passphrase, you create a cryptic, memorable, and poetic hint that helps the recipient remember the passphrase WITHOUT revealing it. The hint must NOT contain the actual passphrase or any direct part of it. Respond only with the hint text — no quotes, no explanation.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.8,
                    "max_tokens": 80,
                },
            )

        if response.status_code != 200:
            logger.error(f"Groq API error (passphrase-hint): {response.text}")
            return hint_fallback(passphrase)

        data = response.json()
        hint = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

        if not hint:
            return hint_fallback(passphrase)

        logger.info("Passphrase hint generated successfully")
        return {"hint": hint}

    except Exception as exc:
        logger.error(f"getPassphraseHint error: {exc}")
        return hint_fallback(passphrase)
