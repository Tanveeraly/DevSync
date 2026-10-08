"""Security utilities – JWT creation / verification and password hashing."""

import base64
from datetime import UTC, datetime, timedelta

from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── Password hashing ────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Return a bcrypt hash of *plain_password*."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return ``True`` if *plain_password* matches *hashed_password*."""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT tokens ───────────────────────────────────────────────────────────────
def create_access_token(
    subject: str | int,
    extra_claims: dict | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT access token.

    Parameters
    ----------
    subject:
        Value written into the ``sub`` claim (typically user ID).
    extra_claims:
        Additional claims merged into the payload.
    expires_delta:
        Custom lifetime; defaults to ``ACCESS_TOKEN_EXPIRE_MINUTES``.
    """
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload: dict = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "access",
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed JWT refresh token."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))
    payload: dict = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token, returning the payload dict.

    Raises
    ------
    JWTError
        If the token is invalid or expired.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])


def create_token(payload: dict, expires_delta: timedelta) -> str:
    """Create a signed token for short-lived OAuth state values."""
    now = datetime.now(UTC)
    token_payload = {**payload, "iat": now, "exp": now + expires_delta}
    return jwt.encode(token_payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def validate_token(token: str) -> dict:
    """Validate a signed token and return its claims."""
    return decode_token(token)


# ── Password-reset tokens ────────────────────────────────────────────────────
def create_password_reset_token(email: str) -> str:
    """Create a short-lived signed JWT for password resets.

    Parameters
    ----------
    email:
        The email address of the user requesting a reset.
    """
    now = datetime.now(UTC)
    expire = now + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    payload: dict = {
        "sub": email,
        "iat": now,
        "exp": expire,
        "type": "password_reset",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def verify_password_reset_token(token: str) -> str:
    """Verify a password-reset JWT and return the email address it was issued for.

    Raises
    ------
    ValueError
        If the token is invalid, expired, or of the wrong type.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid or expired password reset token") from exc

    if payload.get("type") != "password_reset":
        raise ValueError("Invalid token type")

    email: str | None = payload.get("sub")
    if not email:
        raise ValueError("Token missing subject claim")
    return email


def _github_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY.encode("utf-8")
    if len(key) != 32:
        key = key[:32].ljust(32, b"\0")
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_token(token: str) -> str:
    """Encrypt a GitHub OAuth token before storing it in the database."""
    return _github_fernet().encrypt(token.encode("utf-8")).decode("ascii")


def decrypt_token(token: str) -> str:
    """Decrypt a GitHub OAuth token."""
    try:
        return _github_fernet().decrypt(token.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError) as exc:
        raise ValueError("Unable to decrypt GitHub token") from exc
