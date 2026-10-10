from datetime import datetime
from typing import Dict, Any, List
from app.services.llm_adapter.base import BaseLLMAdapter
from app.services.analysis.plain_english import build_analysis_brief


class MockLLMAdapter(BaseLLMAdapter):
    """
    Deterministic synthesizer: turns quant + TA + news into plain-English research text.
    """

    @property
    def adapter_name(self) -> str:
        return "grounded_slm_quant_synthesizer_v1"

    async def health_check(self) -> bool:
        return True

    async def generate_research_report(
        self,
        asset_info: Dict[str, Any],
        market_snapshot: Dict[str, Any],
        technical_signals: Dict[str, Any],
        quant_forecast: Dict[str, Any],
        news_items: List[Dict[str, Any]],
    ) -> Dict[str, Any]:

        symbol = asset_info.get("symbol", "ASSET")
        name = asset_info.get("name", "Financial Asset")
        asset_class = asset_info.get("asset_class", "Equities")

        ref_price = quant_forecast.get("ref_price", 100.0)
        exp_ret = quant_forecast.get("expected_return_pct", 0.0)
        target_p = quant_forecast.get("target_price", ref_price)
        horizon = quant_forecast.get("horizon", "1m")
        trend = quant_forecast.get("trend_classification", "Neutral")
        vol_est = quant_forecast.get("volatility_est", 0.20)
        var_95 = quant_forecast.get("value_at_risk_95", ref_price * 0.05)

        brief = build_analysis_brief(
            symbol=symbol,
            name=name,
            asset_class=asset_class,
            technical_signals={
                **technical_signals,
                "volatility_30d": technical_signals.get(
                    "volatility_30d_annualized", technical_signals.get("volatility_30d")
                ),
            },
            forecast=quant_forecast,
        )

        citations = []
        news_lines = []
        for news in news_items:
            pub_date_formatted = news.get(
                "formatted_datetime", news.get("published_at", datetime.utcnow().isoformat())
            )
            source = news.get("source_name", "Verified Outlets")
            title = news.get("title", "Market Intelligence Update")
            url = news.get("url", "https://official-news.org")
            impact = news.get("impact_rating", "Medium")
            sent = news.get("sentiment_score", 0.0)
            tone = "supportive" if sent >= 0.15 else "cautious" if sent <= -0.15 else "mixed"

            citations.append({
                "source": source,
                "url": url,
                "title": title,
                "published_at": news.get("published_at", datetime.utcnow().isoformat()),
                "formatted_datetime": pub_date_formatted,
                "claim_supported": f"{tone.capitalize()} headline ({impact} impact)",
            })
            news_lines.append(
                f"• {source} ({pub_date_formatted}): {title}\n"
                f"  In plain terms: this reads as a {tone} story for risk assets "
                f"(sentiment {sent:+.2f}). {news.get('summary', '')[:160]}"
            )

        news_narrative = (
            "\n\n".join(news_lines)
            if news_lines
            else "No recent headlines were available for this window — treat news risk as unknown."
        )
        avg_sentiment = sum(n.get("sentiment_score", 0.0) for n in news_items) / max(len(news_items), 1)

        tech = brief["technical"]
        risk_lines = "\n".join(f"- {r['text']}" for r in brief["risk"]) or "- Risk metrics unavailable for this sample."
        fund = brief["fundamentals"]

        hz_plain = {"1d": "next day", "1w": "next week", "1m": "next month", "3m": "next 3 months"}.get(
            str(horizon), str(horizon)
        )
        market_overview = (
            f"In short: {brief['overall']['text']}\n\n"
            f"{name} ({symbol}) last marked near ${ref_price:,.2f} in {asset_class}. "
            f"The model’s most likely path for the {hz_plain} is about {exp_ret:+.1f}% "
            f"(around ${target_p:,.2f}). Recent trend label: {trend}. "
            f"Prices have been swinging about {vol_est * 100:.0f}% a year (annualized); "
            f"a rough stress-case loss sketch is about ${var_95:,.2f} over that horizon.\n\n"
            f"Remember: these are model stories for research, not a recommendation to buy or sell."
        )

        technical_outlook = (
            f"Technical picture (plain English)\n\n"
            f"Overall bias: {brief['overall']['label']}\n\n"
            f"1) Momentum — {tech['momentum']['label']}\n{tech['momentum']['text']}\n\n"
            f"2) Trend — {tech['trend']['label']}\n{tech['trend']['text']}\n\n"
            f"3) Short-term MACD — {tech['macd']['label']}\n{tech['macd']['text']}\n\n"
            f"4) Recent range — {tech['range']['label']}\n{tech['range']['text']}\n\n"
            f"5) Volatility — {tech['volatility']['label']}\n{tech['volatility']['text']}\n\n"
            f"Risk snapshot:\n{risk_lines}"
        )

        drivers = "\n".join(f"- {d}" for d in fund["key_drivers"])
        watch = "\n".join(f"- {w}" for w in fund["what_to_watch"])
        fundamental_outlook = (
            f"Fundamental / macro context (plain English)\n\n"
            f"{fund['headline']}\n\n"
            f"What usually moves this type of asset:\n{drivers}\n\n"
            f"What to watch next:\n{watch}\n\n"
            f"{fund['disclaimer']}"
        )

        news_impact_assessment = (
            f"News in plain English\n\n"
            f"{news_narrative}\n\n"
            f"Average headline sentiment across the sample: {avg_sentiment:+.2f} "
            f"(scale −1 cautious to +1 supportive). Headlines can reverse quickly — "
            f"use them as context, not as a trading signal by themselves."
        )

        scenarios = {
            "bullish": quant_forecast.get("bullish_scenario", {}),
            "base": quant_forecast.get("base_scenario", {}),
            "bearish": quant_forecast.get("bearish_scenario", {}),
        }

        key_risks = [
            f"Rough stress loss near ${var_95:,.2f} for the {hz_plain} — real losses can be larger",
            "Surprise news (rates, inflation, geopolitics) can wipe out a recent chart pattern",
            "In a panic, selling can be harder / worse than recent calm days suggest",
            brief["overall"]["text"],
        ]

        return {
            "asset_id": asset_info.get("id", 1),
            "symbol": symbol,
            "asset_name": name,
            "generated_at": datetime.utcnow().isoformat(),
            "model_used": self.adapter_name,
            "is_llm_fallback": True,
            "freshness": {
                "source": "mock_llm_fallback",
                "realtime": False,
                "status": "fallback",
                "detail": "Ollama unavailable or mock LLM forced — narrative only; prices still from quant",
            },
            "market_overview": market_overview,
            "technical_outlook": technical_outlook,
            "fundamental_outlook": fundamental_outlook,
            "news_impact_assessment": news_impact_assessment,
            "scenarios": scenarios,
            "key_risks": key_risks,
            "grounded_citations": citations,
            "confidence_score": None,
            "analysis_brief": brief,
        }
