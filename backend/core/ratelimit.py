"""Rate limiter compartido (OWASP — protección de APIs).
Keyed por IP. Sin default_limits globales para no afectar el dashboard;
los límites estrictos se aplican por decorador en endpoints sensibles."""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=[])
