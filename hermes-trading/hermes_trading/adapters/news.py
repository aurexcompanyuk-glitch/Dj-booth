import os
import httpx

SCHEMA_VERSION = 1
_COINGECKO = "https://api.coingecko.com/api/v3"
_NEWSAPI = "https://newsapi.org/v2"

_BULLISH = {"surge", "rally", "soar", "breakthrough", "adoption", "bullish", "gain", "moon", "rise", "record"}
_BEARISH = {"crash", "plunge", "ban", "hack", "fraud", "bearish", "dump", "fall", "collapse", "scam"}


class SchemaError(Exception):
    pass


def _sentiment(headlines: list[str]) -> float:
    """Simple keyword sentiment: -1 (very bearish) to +1 (very bullish)."""
    if not headlines:
        return 0.0
    bull = sum(
        1 for h in headlines for w in _BULLISH if w in h.lower()
    )
    bear = sum(
        1 for h in headlines for w in _BEARISH if w in h.lower()
    )
    total = bull + bear
    if total == 0:
        return 0.0
    return (bull - bear) / total


async def fetch() -> dict:
    headlines = []
    news_key = os.getenv("NEWS_API_KEY", "")

    async with httpx.AsyncClient(timeout=15) as client:
        if news_key:
            resp = await client.get(
                f"{_NEWSAPI}/everything",
                params={
                    "q": "bitcoin BTC crypto",
                    "sortBy": "publishedAt",
                    "pageSize": 20,
                    "apiKey": news_key,
                },
            )
            if resp.status_code == 200:
                articles = resp.json().get("articles", [])
                headlines = [a.get("title", "") for a in articles]
        else:
            # Free fallback: CoinGecko news
            resp = await client.get(
                f"{_COINGECKO}/news",
                params={"per_page": 20},
            )
            if resp.status_code == 200:
                articles = resp.json() if isinstance(resp.json(), list) else resp.json().get("data", [])
                headlines = [a.get("title", "") for a in articles[:20]]

    sentiment = _sentiment(headlines)

    return {
        "schema_version": SCHEMA_VERSION,
        "headline_count": len(headlines),
        "sentiment": sentiment,
        "sentiment_label": "bullish" if sentiment > 0.1 else "bearish" if sentiment < -0.1 else "neutral",
        "sample_headline": headlines[0] if headlines else "",
    }
