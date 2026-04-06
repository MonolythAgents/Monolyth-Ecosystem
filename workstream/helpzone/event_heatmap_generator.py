from typing import List, Tuple, Dict

def generate_activity_heatmap(
    timestamps: List[int],
    counts: List[int],
    buckets: int = 10,
    normalize: bool = True
) -> List[float]:
    """
    Bucket activity counts into `buckets` time intervals.
    
    Args:
        timestamps: List of epoch ms timestamps.
        counts: List of integer counts per timestamp (same length as timestamps).
        buckets: Number of buckets (default=10).
        normalize: If True, normalize values to [0.0–1.0].
    
    Returns:
        List of bucketed values (float if normalized, int otherwise).
    
    Example:
        >>> generate_activity_heatmap([1000, 2000, 3000], [5, 10, 20], buckets=2)
        [0.3333, 1.0]
    """

    if not timestamps or not counts:
        return []
    if len(timestamps) != len(counts):
        raise ValueError("timestamps and counts must have equal length")
    if buckets <= 0:
        raise ValueError("buckets must be positive")

    # --- Determine bucket span ---
    t_min, t_max = min(timestamps), max(timestamps)
    span = t_max - t_min or 1
    bucket_size = span / buckets

    # --- Aggregate counts ---
    agg = [0] * buckets
    for t, c in zip(timestamps, counts):
        idx = min(buckets - 1, int((t - t_min) / bucket_size))
        agg[idx] += c

    # --- Normalize if requested ---
    if normalize:
        max_val = max(agg) or 1
        return [round(val / max_val, 4) for val in agg]
    return agg


def summarize_heatmap(values: List[float]) -> Dict[str, float]:
    """
    Return summary statistics for a heatmap (mean, total, peak).
    """
    if not values:
        return {"total": 0.0, "average": 0.0, "peak": 0.0}
    total = sum(values)
    return {
        "total": total,
        "average": round(total / len(values), 4),
        "peak": max(values)
    }
