import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

class AIServiceBase(ABC):
    """Base class for all AI services to ensure consistent logging and interface."""
    
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.logger = logging.getLogger(f"{__name__}.{service_name}")
        self.logger.info(f"Initializing {service_name}")

    def _log_error(self, message: str, error: Exception):
        self.logger.error(f"Error in {self.service_name}: {message} -> {error}")

    def _log_info(self, message: str):
        self.logger.info(f"{self.service_name}: {message}")
