import math
from typing import Dict, Any

def calculate_risk_score(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> float:
    """
    Compute a 0–100 risk score for a token.
    
    Components:
    - Volatility: large price swings increase risk (up to 50 points).
    - Liquidity: low liquidity increases risk (up to 30 points).
    - Flags: each bit in flags_mask adds a fixed penalty (5 points).
    
    Args:
        price_change_pct: Percent change over period (e.g. +5.0 for +5%).
        liquidity_usd: Liquidity depth in USD.
        flags_mask: Integer bitmask representing triggered risk flags.
    
    Returns:
        Risk score, capped at 100.
    """

    # --- Volatility component (max 50) ---
    vol_ratio = abs(price_change_pct) / 10
    vol_score = min(vol_ratio, 1.0) * 50

    # --- Liquidity component (inverse relationship, max 30) ---
    if liquidity_usd > 0:
        scale = math.log10(max(liquidity_usd, 1))
        liq_score = max(0.0, 30 - scale * 5)
    else:
        liq_score = 30.0  # maximum penalty if no liquidity

    # --- Flag penalties (5 points per set bit) ---
    flag_count = bin(flags_mask).count("1")
    flag_score = flag_count * 5

    # --- Final aggregation ---
    raw_score = vol_score + liq_score + flag_score
    score = min(round(raw_score, 2), 100.0)
    return score


def explain_risk_components(price_change_pct: float, liquidity_usd: float, flags_mask: int) -> Dict[str, Any]:
    """
    Break down the risk score into individual components for transparency.
    """
    return {
        "price_change_pct": price_change_pct,
        "liquidity_usd": liquidity_usd,
        "flags_mask": flags_mask,
        "score": calculate_risk_score(price_change_pct, liquidity_usd, flags_mask),
    }
