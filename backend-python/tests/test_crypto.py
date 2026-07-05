import pytest

from app.crypto import TokenCipher, generate_key


def test_roundtrip():
    cipher = TokenCipher(generate_key())
    secret = "ya29.a0AfH6SMBx-token-sensible"
    assert cipher.decrypt(cipher.encrypt(secret)) == secret


def test_ciphertext_differs_from_plaintext():
    cipher = TokenCipher(generate_key())
    assert cipher.encrypt("abc") != "abc"


def test_missing_key_rejected():
    with pytest.raises(ValueError):
        TokenCipher("")
