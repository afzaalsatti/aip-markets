/** Back-compat shape for any leftover imports; canonical glossary lives in AppGuideData. */
import { GLOSSARY } from './AppGuideData';

export const INSIGHT_DICTIONARY: Record<
  string,
  {
    title: string;
    category: string;
    description: string;
    wallStreetInterpretation: string;
    ruleOfThumb: string;
  }
> = Object.fromEntries(
  GLOSSARY.map((g) => [
    g.id,
    {
      title: g.title,
      category: g.category,
      description: g.description,
      wallStreetInterpretation: g.howToRead,
      ruleOfThumb: g.ruleOfThumb,
    },
  ])
);
