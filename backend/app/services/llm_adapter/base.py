from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseLLMAdapter(ABC):
    @property
    @abstractmethod
    def adapter_name(self) -> str:
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        pass

    @abstractmethod
    async def generate_research_report(
        self, 
        asset_info: Dict[str, Any],
        market_snapshot: Dict[str, Any],
        technical_signals: Dict[str, Any],
        quant_forecast: Dict[str, Any],
        news_items: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes validated quantitative outputs and news evidence into a structured AI Research Report.
        Must return dict conforming to AIResearchReportResponse schema.
        """
        pass
