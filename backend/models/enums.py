from enum import Enum


class Pool(str, Enum):
    """Shared enum module for models that need common tournament enums."""
    A = "A"
    B = "B"
    C = "C"
    D = "D"


