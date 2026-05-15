import re

import pyotp


def new_totp_secret() -> str:
    return pyotp.random_base32()


def provisioning_uri(secret: str, email: str, issuer: str = "Moov'Up") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name=issuer)


def verify_totp(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    clean = re.sub(r"\s+", "", code.strip())
    if not clean.isdigit() or len(clean) < 6:
        return False
    return pyotp.TOTP(secret).verify(clean, valid_window=1)
