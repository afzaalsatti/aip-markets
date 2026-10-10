"""
Turn raw TA / forecast numbers into short, plain-English takeaways.
Deterministic — no LLM required.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional


def _f(v: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        if v is None:
            return default
        return float(v)
    except (TypeError, ValueError):
        return default


def _rsi_reading(rsi: Optional[float]) -> Dict[str, str]:
    if rsi is None:
        return {"label": "Unknown", "tone": "neutral", "text": "Not enough price history to judge momentum."}
    if rsi >= 70:
        return {
            "label": "Stretched higher",
            "tone": "warn",
            "text": f"RSI is {rsi:.0f}: recent buying has been strong. Pullbacks are more common after this zone.",
        }
    if rsi <= 30:
        return {
            "label": "Stretched lower",
            "tone": "warn",
            "text": f"RSI is {rsi:.0f}: selling has been heavy. Short-term rebounds often show up from here.",
        }
    if rsi >= 55:
        return {
            "label": "Mildly bullish",
            "tone": "up",
            "text": f"RSI is {rsi:.0f}: buyers have a slight edge, without looking extreme.",
        }
    if rsi <= 45:
        return {
            "label": "Mildly bearish",
            "tone": "down",
            "text": f"RSI is {rsi:.0f}: sellers have a slight edge, without panic levels.",
        }
    return {
        "label": "Balanced",
        "tone": "neutral",
        "text": f"RSI is {rsi:.0f}: momentum is roughly balanced between buyers and sellers.",
    }


def _trend_reading(trend: Optional[str], price: Optional[float], sma20: Optional[float], sma50: Optional[float]) -> Dict[str, str]:
    t = (trend or "").lower()
    if "bullish" in t:
        label, tone = "Uptrend", "up"
    elif "bearish" in t:
        label, tone = "Downtrend", "down"
    else:
        label, tone = "Sideways", "neutral"

    bits = []
    if price is not None and sma50 is not None:
        if price > sma50:
            bits.append("price is above the 50-day average (usually supportive)")
        else:
            bits.append("price is below the 50-day average (usually a headwind)")
    if sma20 is not None and sma50 is not None:
        if sma20 > sma50:
            bits.append("the short average is above the medium one (short-term strength)")
        else:
            bits.append("the short average is below the medium one (short-term softness)")

    detail = "; ".join(bits) if bits else "moving averages do not show a clear edge"
    return {
        "label": label,
        "tone": tone,
        "text": f"Trend reads as {label.lower()}. {detail.capitalize()}.",
    }


def _macd_reading(hist: Optional[float]) -> Dict[str, str]:
    if hist is None:
        return {"label": "Unavailable", "tone": "neutral", "text": "MACD is not available for this window."}
    if hist > 0:
        return {
            "label": "Positive momentum",
            "tone": "up",
            "text": "MACD histogram is positive: short-term momentum is leaning up versus its signal line.",
        }
    if hist < 0:
        return {
            "label": "Negative momentum",
            "tone": "down",
            "text": "MACD histogram is negative: short-term momentum is leaning down versus its signal line.",
        }
    return {"label": "Flat", "tone": "neutral", "text": "MACD is flat: no clear short-term momentum edge."}


def _bb_reading(pct_b: Optional[float]) -> Dict[str, str]:
    if pct_b is None:
        return {"label": "Unavailable", "tone": "neutral", "text": "Bollinger position is unavailable."}
    if pct_b >= 1.0:
        return {
            "label": "Near upper band",
            "tone": "warn",
            "text": "Price is at/above the upper Bollinger band — short-term stretch to the upside.",
        }
    if pct_b <= 0.0:
        return {
            "label": "Near lower band",
            "tone": "warn",
            "text": "Price is at/below the lower Bollinger band — short-term stretch to the downside.",
        }
    if pct_b >= 0.7:
        return {
            "label": "Upper half",
            "tone": "up",
            "text": "Price sits in the upper half of its recent range (firmer tape).",
        }
    if pct_b <= 0.3:
        return {
            "label": "Lower half",
            "tone": "down",
            "text": "Price sits in the lower half of its recent range (softer tape).",
        }
    return {
        "label": "Mid-range",
        "tone": "neutral",
        "text": "Price is near the middle of its recent Bollinger range.",
    }


def _vol_reading(vol: Optional[float], regime: Optional[str]) -> Dict[str, str]:
    if vol is None:
        return {"label": "Unknown", "tone": "neutral", "text": "Volatility could not be estimated."}
    pct = vol * 100
    if pct >= 35:
        label, tone = "High", "warn"
        tip = "swings are large — position size and stop distance matter more"
    elif pct <= 15:
        label, tone = "Low", "neutral"
        tip = "moves are relatively calm — breakouts can surprise when vol expands"
    else:
        label, tone = "Normal", "neutral"
        tip = "typical market noise for this asset class"
    reg = f" ({regime})" if regime else ""
    return {
        "label": f"{label} vol{reg}",
        "tone": tone,
        "text": f"Annualized 30-day volatility is about {pct:.0f}% — {tip}.",
    }


def _risk_reading(
    sharpe: Optional[float],
    beta: Optional[float],
    mdd: Optional[float],
    cvar: Optional[float],
    beta_bench: str = "SPY",
) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    if sharpe is not None:
        if sharpe >= 1.5:
            tip = "historically rewarded risk well in this sample"
            tone = "up"
        elif sharpe >= 1.0:
            tip = "acceptable return for the risk taken"
            tone = "up"
        elif sharpe >= 0:
            tip = "returns have not fully compensated for swings"
            tone = "warn"
        else:
            tip = "risk has outweighed return in this window"
            tone = "down"
        out.append({
            "label": "Risk-adjusted return",
            "tone": tone,
            "text": f"Sharpe {sharpe:.2f}: {tip}. (Higher is better; ~1.0 is a common bar.)",
        })
    if beta is not None:
        if beta >= 1.2:
            tip = f"tends to move more than {beta_bench} — gains and losses can be amplified"
            tone = "warn"
        elif beta <= 0.8:
            tip = f"tends to move less than {beta_bench} — often a bit more defensive"
            tone = "neutral"
        else:
            tip = f"moves roughly in line with {beta_bench}"
            tone = "neutral"
        out.append({
            "label": "Market sensitivity",
            "tone": tone,
            "text": f"Beta {beta:.2f}x vs {beta_bench}: {tip}.",
        })
    if mdd is not None:
        out.append({
            "label": "Worst slide",
            "tone": "down" if mdd <= -15 else "warn",
            "text": f"Maximum drawdown was {mdd:.1f}% from peak to trough in the sample — a sense of historical pain.",
        })
    if cvar is not None:
        out.append({
            "label": "Bad-day average",
            "tone": "down",
            "text": f"On the ugliest ~5% of days, the average daily move was about {cvar:.2f}%.",
        })
    return out


def _fundamental_context(asset_class: str, symbol: str, name: str) -> Dict[str, Any]:
    """Rule-based fundamental / macro framing by asset class — educational, not advice."""
    ac = (asset_class or "Equities").lower()
    drivers: List[str]
    watch: List[str]
    plain: str

    if "commodit" in ac:
        drivers = [
            "Supply/demand balances and inventory reports",
            "US dollar strength (often inverse for dollar-priced commodities)",
            "Geopolitics and shipping / logistics shocks",
        ]
        watch = ["Inventory releases", "USD moves", "Seasonal demand"]
        plain = (
            f"{name} ({symbol}) is a commodity-linked instrument. Prices mainly reflect physical "
            "supply, industrial or investment demand, and the dollar — not company earnings."
        )
    elif "forex" in ac:
        drivers = [
            "Interest-rate differentials between the two currencies",
            "Inflation and central-bank guidance",
            "Risk sentiment (safe-haven flows into USD, JPY, CHF at times)",
        ]
        watch = ["Central bank meetings", "CPI / jobs data", "Yield spreads"]
        plain = (
            f"{name} ({symbol}) is a currency pair. Direction is driven by relative rates and growth "
            "expectations between the two economies, not a single company's balance sheet."
        )
    elif "crypto" in ac:
        drivers = [
            "Liquidity and risk appetite across global markets",
            "ETF / institutional flow headlines",
            "Network activity and regulatory news",
        ]
        watch = ["Risk-on/off equity tone", "ETF flow reports", "Regulatory headlines"]
        plain = (
            f"{name} ({symbol}) is a digital asset. Fundamentals here mean adoption, liquidity, "
            "and policy news more than traditional earnings multiples."
        )
    elif "fixed" in ac or "bond" in ac or "income" in ac:
        drivers = [
            "Policy rate path and inflation expectations",
            "Credit spreads (for credit-sensitive bonds)",
            "Duration: how sensitive price is to yield changes",
        ]
        watch = ["Fed / ECB path", "Inflation prints", "Yield curve shape"]
        plain = (
            f"{name} ({symbol}) sits in rates / fixed income. When yields rise, prices of longer bonds "
            "usually fall — and the opposite when yields fall."
        )
    else:
        drivers = [
            "Revenue / earnings growth and margins",
            "Valuation versus peers and history",
            "Sector demand and competitive position",
        ]
        watch = ["Earnings dates", "Guidance changes", "Sector news"]
        plain = (
            f"{name} ({symbol}) is an equity-style instrument. Over longer horizons, cash flows and "
            "valuation matter; over shorter horizons, risk sentiment and technicals often dominate."
        )

    return {
        "headline": plain,
        "key_drivers": drivers,
        "what_to_watch": watch,
        "disclaimer": "Educational framing only — not a valuation model or investment recommendation.",
    }


def _overall_bias(readings: List[Dict[str, str]]) -> Dict[str, str]:
    score = 0
    for r in readings:
        tone = r.get("tone")
        if tone == "up":
            score += 1
        elif tone == "down":
            score -= 1
        elif tone == "warn":
            score += 0  # stretch, not directional edge
    if score >= 2:
        return {
            "label": "Constructive",
            "tone": "up",
            "text": "Short-term signals lean constructive. Still check risk metrics and news before acting.",
        }
    if score <= -2:
        return {
            "label": "Cautious",
            "tone": "down",
            "text": "Short-term signals lean cautious. Weakness may persist until momentum stabilizes.",
        }
    return {
        "label": "Mixed / range-bound",
        "tone": "neutral",
        "text": "Signals are mixed. Price may chop sideways until a clearer trend emerges.",
    }


def build_analysis_brief(
    *,
    symbol: str,
    name: str,
    asset_class: str,
    technical_signals: Dict[str, Any],
    forecast: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    price = _f(technical_signals.get("latest_price"))
    rsi = _f(technical_signals.get("rsi_14"))
    sma20 = _f(technical_signals.get("sma_20"))
    sma50 = _f(technical_signals.get("sma_50"))
    macd_h = _f(technical_signals.get("macd_hist"))
    pct_b = _f(technical_signals.get("bollinger_pct_b"))
    vol = _f(technical_signals.get("volatility_30d_annualized") or technical_signals.get("volatility_30d"))
    regime = technical_signals.get("volatility_regime")
    trend = technical_signals.get("trend_classification") or (forecast or {}).get("trend_classification")
    sharpe = _f(technical_signals.get("sharpe_ratio"))
    beta = _f(technical_signals.get("beta_market"))
    mdd = _f(technical_signals.get("max_drawdown_pct"))
    cvar = _f(technical_signals.get("cvar_95_pct"))
    beta_bench = technical_signals.get("beta_benchmark") or "SPY"

    momentum = _rsi_reading(rsi)
    trend_r = _trend_reading(trend, price, sma20, sma50)
    macd_r = _macd_reading(macd_h)
    bb_r = _bb_reading(pct_b)
    vol_r = _vol_reading(vol, regime)
    risk_items = _risk_reading(sharpe, beta, mdd, cvar, str(beta_bench))
    fundamentals = _fundamental_context(asset_class, symbol, name)
    overall = _overall_bias([momentum, trend_r, macd_r, bb_r])

    horizon_plain = {
        "1d": "the next day",
        "1w": "the next week",
        "1m": "the next month",
        "3m": "the next 3 months",
    }

    forecast_bits: List[str] = []
    if forecast:
        exp = _f(forecast.get("expected_return_pct"))
        horizon = str(forecast.get("horizon", "1m"))
        hz = horizon_plain.get(horizon, horizon)
        base = forecast.get("base_scenario") or {}
        if exp is not None:
            forecast_bits.append(
                f"Most likely path for {hz}: about {exp:+.1f}% "
                f"(price near {base.get('target_price', 'n/a')})."
            )
        bull = forecast.get("bullish_scenario") or {}
        bear = forecast.get("bearish_scenario") or {}
        if bull and bear:
            bp = bull.get("probability")
            ep = bear.get("probability")
            bp_pct = f"{round(float(bp) * 100)}%" if bp is not None else "n/a"
            ep_pct = f"{round(float(ep) * 100)}%" if ep is not None else "n/a"
            forecast_bits.append(
                f"If things go well: about {bull.get('expected_return_pct')}% "
                f"(model odds ~{bp_pct}). "
                f"If things go poorly: about {bear.get('expected_return_pct')}% "
                f"(model odds ~{ep_pct})."
            )
        var95 = _f(forecast.get("value_at_risk_95"))
        if var95 is not None:
            forecast_bits.append(
                f"Rough stress loss the model flags for {hz}: about ${var95:,.2f} "
                f"(a bad-case sketch — not a guarantee)."
            )

    takeaways = [
        overall["text"],
        momentum["text"],
        trend_r["text"],
        fundamentals["headline"],
    ]

    return {
        "symbol": symbol,
        "overall": overall,
        "takeaways": takeaways,
        "technical": {
            "momentum": momentum,
            "trend": trend_r,
            "macd": macd_r,
            "range": bb_r,
            "volatility": vol_r,
        },
        "risk": risk_items,
        "fundamentals": fundamentals,
        "forecast_plain": forecast_bits,
        "glossary_hint": "Tap any (i) icon on metrics for a short definition.",
    }
