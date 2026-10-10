"""Shared freshness / data-quality metadata for API responses."""
from datetime import datetime, timezone
from typing import Any, Dict, Optional


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def freshness(
    *,
    source: str,
    realtime: bool,
    status: str = "ok",
    as_of: Optional[str] = None,
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    """
    status: ok | degraded | unavailable | fallback
    realtime: True when values come from a live upstream pull this request
    """
    payload: Dict[str, Any] = {
        "source": source,
        "realtime": realtime,
        "status": status,
        "as_of": as_of or utc_now_iso(),
    }
    if detail:
        payload["detail"] = detail
    return payload


def unavailable(source: str, detail: str) -> Dict[str, Any]:
    return freshness(
        source=source,
        realtime=False,
        status="unavailable",
        detail=detail,
    )
