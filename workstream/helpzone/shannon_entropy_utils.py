import math
from typing import List, Dict, Any

def compute_shannon_entropy(addresses: List[str], normalize: bool = False) -> float:
    """
    Compute Shannon entropy (bits) of a list of addresses.
    
    Args:
        addresses: List of string identifiers (e.g., wallet addresses).
        normalize: If True, scale result into [0, 1] by dividing by log2(N).
    
    Returns:
        Shannon entropy value (rounded to 4 decimals).
        If normalize=True, returns fraction of maximum possible entropy.
    
    Example:
        >>> compute_shannon_entropy(["A", "A", "B", "C"])
        1.5
        >>> compute_shannon_entropy(["A", "A", "B", "C"], normalize=True)
        0.75
    """
    if not addresses:
        return 0.0

    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1

    total = len(addresses)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        entropy -= p * math.log2(p)

    if normalize and total > 1:
        entropy /= math.log2(total)

    return round(entropy, 4)


def entropy_distribution(addresses: List[str]) -> Dict[str, Any]:
    """
    Return frequency distribution with relative probabilities for inspection.
    """
    if not addresses:
        return {"total": 0, "distribution": {}}
    freq: Dict[str, int] = {}
    for a in addresses:
        freq[a] = freq.get(a, 0) + 1
    total = len(addresses)
    return {
        "total": total,
        "distribution": {k: round(v / total, 4) for k, v in freq.items()}
    }
