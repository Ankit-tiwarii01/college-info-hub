from slowapi import Limiter
from slowapi.util import get_remote_address

# Global Rate Limiter instance based on remote IP address
limiter = Limiter(key_func=get_remote_address)
