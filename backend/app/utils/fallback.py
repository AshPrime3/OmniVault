"""
OmniVault — AI fallback functions (rule-based).
Exact port of the Node.js fallback logic.
"""


def security_fallback(filename: str, size_bytes: int | None) -> dict:
    """Rule-based security suggestion when Groq is unavailable."""
    name = filename.lower()

    high_kw = [
        "tax", "passport", "id", "ssn", "secret", "confidential", "contract",
        "legal", "salary", "medical", "health", "bank", "credential", "password",
        "private", "personal", "invoice", "kyc", "nda", "finance", "statement",
    ]
    low_kw = [
        "meme", "fun", "cat", "dog", "music", "video", "photo", "wallpaper",
        "game", "funny", "clip", "reel", "selfie", "pic",
    ]

    sensitivity = "medium"
    if any(kw in name for kw in high_kw):
        sensitivity = "high"
    elif any(kw in name for kw in low_kw):
        sensitivity = "low"

    presets = {
        "high": {"downloadLimit": 1, "expiresInMinutes": 60, "reason": "Sensitive filename detected — strict limits applied."},
        "medium": {"downloadLimit": 5, "expiresInMinutes": 1440, "reason": "Standard file — balanced settings recommended."},
        "low": {"downloadLimit": 10, "expiresInMinutes": 10080, "reason": "Non-sensitive media — relaxed limits applied."},
    }

    return {
        "sensitivity": sensitivity,
        **presets[sensitivity],
        "badge": build_security_badge(sensitivity),
    }


def hint_fallback(passphrase: str) -> dict:
    """Rule-based passphrase hint when Groq is unavailable."""
    length = len(passphrase)
    hints = [
        f"Where your memory begins, {length} steps away.",
        "The key lives in the quiet corner of your mind.",
        "Something only you would whisper in the dark.",
        "A secret between you and time.",
    ]
    return {"hint": hints[length % len(hints)]}


def build_security_badge(sensitivity: str) -> str:
    badge_map = {
        "high": "🔴 High Sensitivity",
        "medium": "🟡 Medium Sensitivity",
        "low": "🟢 Low Sensitivity",
    }
    return badge_map.get(sensitivity, badge_map["medium"])


def clamp(val: int, min_val: int, max_val: int) -> int:
    return max(min_val, min(val, max_val))


def snap_expiry(minutes: int) -> int:
    valid = [15, 30, 60, 360, 1440, 10080]
    return min(valid, key=lambda v: abs(v - minutes))
