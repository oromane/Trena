"""Logs structurés JSON vers stdout (visibles via `docker compose logs`).

Chaque enregistrement inclut niveau, logger, message, la trace en cas
d'exception, et tout champ `extra` passé au logger (ex. method/path/status/body
pour les erreurs Supabase). Aucun service externe requis.
"""
import json
import logging
import sys

# Attributs standard d'un LogRecord : tout le reste est considéré comme `extra`.
_STD = set(
    logging.LogRecord("", 0, "", 0, "", (), None).__dict__.keys()
) | {"message", "asctime", "taskName"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict = {
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in _STD and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(level)
