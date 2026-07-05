"""Chiffrement applicatif des tokens OAuth (Fernet / AES-128-CBC + HMAC)."""
from cryptography.fernet import Fernet


def generate_key() -> str:
    """Génère une clé Fernet (à stocker dans TOKEN_ENCRYPTION_KEY)."""
    return Fernet.generate_key().decode()


class TokenCipher:
    def __init__(self, key: str) -> None:
        if not key:
            raise ValueError("TOKEN_ENCRYPTION_KEY manquante")
        self._fernet = Fernet(key.encode())

    def encrypt(self, plaintext: str) -> str:
        return self._fernet.encrypt(plaintext.encode()).decode()

    def decrypt(self, ciphertext: str) -> str:
        return self._fernet.decrypt(ciphertext.encode()).decode()
