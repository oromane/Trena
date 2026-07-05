"""Configuration centralisée du moteur de performance."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_service_role_key: str = ""

    # Clé partagée entre services internes (Next.js, n8n) et le moteur
    internal_api_key: str = ""

    # Google Calendar API (OAuth2)
    google_client_id: str = ""
    google_client_secret: str = ""

    # Clé Fernet (base64, 32 octets) pour chiffrer les tokens OAuth en base
    token_encryption_key: str = ""

    # Paramètres par défaut du modèle de Banister
    default_tau1: float = 42.0   # décroissance aptitude (jours)
    default_tau2: float = 7.0    # décroissance fatigue (jours)
    default_k1: float = 1.0
    default_k2: float = 2.0

    # Ajustement HRV
    hrv_baseline_days: int = 28
    hrv_caution_z: float = -1.0      # en-dessous : vigilance
    hrv_critical_z: float = -1.5     # en-dessous + déficit sommeil : réduction
    sleep_deficit_minutes: int = 60  # déficit vs baseline déclencheur

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
