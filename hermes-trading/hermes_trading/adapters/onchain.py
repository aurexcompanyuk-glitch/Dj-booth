import httpx

SCHEMA_VERSION = 1
_COINGECKO = "https://api.coingecko.com/api/v3"


class SchemaError(Exception):
    pass


async def fetch() -> dict:
    """Fetch on-chain / market metrics from CoinGecko free API."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_COINGECKO}/coins/bitcoin",
            params={
                "localization": "false",
                "tickers": "false",
                "community_data": "true",
                "developer_data": "false",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    market = data.get("market_data", {})
    community = data.get("community_data", {})

    result = {
        "schema_version": SCHEMA_VERSION,
        "market_cap_usd": market.get("market_cap", {}).get("usd", 0),
        "total_volume_usd": market.get("total_volume", {}).get("usd", 0),
        "circulating_supply": market.get("circulating_supply", 0),
        "price_change_24h_pct": market.get("price_change_percentage_24h", 0),
        "price_change_7d_pct": market.get("price_change_percentage_7d", 0),
        "ath_usd": market.get("ath", {}).get("usd", 0),
        "ath_change_pct": market.get("ath_change_percentage", {}).get("usd", 0),
        "reddit_subscribers": community.get("reddit_subscribers", 0),
        "twitter_followers": community.get("twitter_followers", 0),
    }

    return result
