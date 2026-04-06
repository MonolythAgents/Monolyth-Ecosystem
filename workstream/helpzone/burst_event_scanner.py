from typing import List, Dict, Union, Optional

def detect_volume_bursts(
    volumes: List[float],
    threshold_ratio: float = 1.5,
    min_interval: int = 1,
    timestamps: Optional[List[int]] = None
) -> List[Dict[str, Union[int, float]]]:
    """
    Identify points where volume jumps by threshold_ratio relative to previous value.
    
    Args:
        volumes: List of volume values (floats).
        threshold_ratio: Minimum ratio of current/previous volume to trigger (default 1.5).
        min_interval: Minimum distance (in indices) between two events.
        timestamps: Optional parallel list of epoch ms timestamps.
    
    Returns:
        List of dictionaries with details for each burst event.
        Keys: index, previous, current, ratio, delta, (timestamp if provided).
    """
    if not volumes or len(volumes) < 2:
        return []
    if timestamps and len(timestamps) != len(volumes):
        raise ValueError("timestamps must match volumes length")

    events: List[Dict[str, Union[int, float]]] = []
    last_idx = -min_interval

    for i in range(1, len(volumes)):
        prev, curr = volumes[i - 1], volumes[i]
        ratio = (curr / prev) if prev > 0 else float("inf")
        if ratio >= threshold_ratio and (i - last_idx) >= min_interval:
            event: Dict[str, Union[int, float]] = {
                "index": i,
                "previous": prev,
                "current": curr,
                "ratio": round(ratio, 4),
                "delta": round(curr - prev, 4),
            }
            if timestamps:
                event["timestamp"] = timestamps[i]
            events.append(event)
            last_idx = i
    return events


def summarize_bursts(events: List[Dict[str, Union[int, float]]]) -> Dict[str, float]:
    """
    Provide summary statistics for detected volume bursts.
    Returns count, max_ratio, and average_delta.
    """
    if not events:
        return {"count": 0, "max_ratio": 0.0, "avg_delta": 0.0}
    count = len(events)
    max_ratio = max(e["ratio"] for e in events if isinstance(e["ratio"], (int, float)))
    avg_delta = sum(e["delta"] for e in events if isinstance(e["delta"], (int, float))) / count
    return {"count": count, "max_ratio": max_ratio, "avg_delta": round(avg_delta, 4)}
