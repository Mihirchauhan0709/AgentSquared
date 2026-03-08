"""
Twitter / X posting service.
Uses tweepy (OAuth 1.0a) to post approved replies on behalf of the brand account.
"""

import tweepy
from config import settings


def _get_client() -> tweepy.Client | None:
    """Build a Tweepy v2 client. Returns None if credentials are missing."""
    if not all([
        settings.TWITTER_API_KEY,
        settings.TWITTER_API_SECRET,
        settings.TWITTER_ACCESS_TOKEN,
        settings.TWITTER_ACCESS_TOKEN_SECRET,
    ]):
        return None

    return tweepy.Client(
        consumer_key=settings.TWITTER_API_KEY,
        consumer_secret=settings.TWITTER_API_SECRET,
        access_token=settings.TWITTER_ACCESS_TOKEN,
        access_token_secret=settings.TWITTER_ACCESS_TOKEN_SECRET,
    )


def post_reply(reply_text: str, in_reply_to_tweet_id: str | None = None) -> dict:
    """
    Post a tweet (optionally as a reply).

    Args:
        reply_text: The text of the reply to post.
        in_reply_to_tweet_id: The tweet ID to reply to (optional).

    Returns:
        dict with 'success', 'tweet_id', and 'url' keys.
    """
    client = _get_client()
    if client is None:
        return {"success": False, "error": "Twitter credentials not configured"}

    try:
        kwargs = {"text": reply_text}
        if in_reply_to_tweet_id:
            kwargs["in_reply_to_tweet_id"] = in_reply_to_tweet_id

        response = client.create_tweet(**kwargs)
        tweet_id = response.data["id"]
        return {
            "success": True,
            "tweet_id": tweet_id,
            "url": f"https://twitter.com/i/web/status/{tweet_id}",
        }
    except tweepy.TweepyException as e:
        return {"success": False, "error": str(e)}


def twitter_configured() -> bool:
    """Check if Twitter credentials are set."""
    return bool(settings.TWITTER_API_KEY and settings.TWITTER_ACCESS_TOKEN)
