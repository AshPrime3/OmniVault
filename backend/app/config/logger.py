"""
OmniVault — Structured logging setup.
Mirrors Winston/Morgan: JSON format to file, colorized to console.
"""

import logging
import sys
from pathlib import Path


def setup_logging():
    """Configure root 'omnivault' logger with console + file handlers."""
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    logger = logging.getLogger("omnivault")
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers on reload
    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        "%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    json_formatter = logging.Formatter(
        '{"timestamp":"%(asctime)s","level":"%(levelname)s","message":"%(message)s"}',
        datefmt="%Y-%m-%dT%H:%M:%S",
    )

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Error file handler
    error_handler = logging.FileHandler(log_dir / "error.log")
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(json_formatter)
    logger.addHandler(error_handler)

    # Combined file handler
    combined_handler = logging.FileHandler(log_dir / "combined.log")
    combined_handler.setLevel(logging.INFO)
    combined_handler.setFormatter(json_formatter)
    logger.addHandler(combined_handler)

    return logger
