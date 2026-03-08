"""
Bluesky (AT Protocol) client service.
Handles authentication, fetching notifications (mentions), and posting replies.
"""

from typing import Optional, List, Dict
from atproto import Client, models
from config import settings

def _get_client() -> Optional[Client]:
    """
    Builds and authenticates a Bluesky client.
    Returns None if credentials are missing or login fails.
    """
    if not settings.BLUESKY_HANDLE or not settings.BLUESKY_PASSWORD:
        return None

    client = Client()
    try:
        client.login(settings.BLUESKY_HANDLE, settings.BLUESKY_PASSWORD)
        return client
    except Exception as e:
        print(f"⚠️ Bluesky login failed: {e}")
        return None

def fetch_mentions() -> List[Dict]:
    """
    Fetches recent mentions for the authenticated account.
    Returns a list of mention dictionaries formatted for the social monitor.
    """
    client = _get_client()
    if not client:
        return []

    try:
        # Fetch notifications (mentions have 'mention' or 'reply' reason)
        resp = client.app.bsky.notification.list_notifications()
        mentions = []
        for note in resp.notifications:
            # We filter for 'mention' or 'reply' reasons
            if note.reason in ('mention', 'reply'):
                # Fetch full post content for the mention
                post = note.record
                # Extract root CID/URI if this is a reply to a thread
                reply_info = getattr(post, 'reply', None)
                root_cid = note.cid
                root_uri = note.uri
                if reply_info and hasattr(reply_info, 'root'):
                    root_cid = reply_info.root.cid
                    root_uri = reply_info.root.uri

                mentions.append({
                    "author": note.author.display_name or note.author.handle,
                    "author_handle": note.author.handle,
                    "text": post.text,
                    "platform": "bluesky",
                    "post_cid": note.cid,
                    "post_uri": note.uri,
                    "root_cid": root_cid,
                    "root_uri": root_uri,
                    "indexed_at": note.indexed_at,
                })
        return mentions
    except Exception as e:
        print(f"⚠️ Bluesky fetch failed: {e}")
        return []

def post_reply(text: str, parent_uri: str, parent_cid: str, root_uri: Optional[str] = None, root_cid: Optional[str] = None) -> Dict:
    """
    Posts a reply to a Bluesky post.
    """
    client = _get_client()
    if not client:
        return {"success": False, "error": "Bluesky not configured"}

    try:
        # Use provided root if available, otherwise parent is root
        actual_root_uri = root_uri or parent_uri
        actual_root_cid = root_cid or parent_cid
        
        root = models.ComAtprotoRepoStrongRef.Main(cid=actual_root_cid, uri=actual_root_uri)
        parent = models.ComAtprotoRepoStrongRef.Main(cid=parent_cid, uri=parent_uri)
        reply_ref = models.AppBskyFeedPost.ReplyRef(parent=parent, root=root)
        
        resp = client.send_post(text=text, reply_to=reply_ref)
        return {
            "success": True,
            "uri": resp.uri,
            "cid": resp.cid,
        }
    except Exception as e:
        print(f"⚠️ Bluesky post failed: {e}")
        return {"success": False, "error": str(e)}

def bluesky_configured() -> bool:
    """Check if Bluesky credentials are set."""
    return bool(settings.BLUESKY_HANDLE and settings.BLUESKY_PASSWORD)

def post_with_image(text: str, image_bytes: bytes, alt_text: str = "") -> Dict:
    """
    Posts a message to Bluesky with an attached image.
    """
    client = _get_client()
    if not client:
        return {"success": False, "error": "Bluesky not configured"}

    try:
        # Upload the image blob
        blob_resp = client.com.atproto.repo.upload_blob(image_bytes)
        
        # Attach the image to the post embed
        embed = models.AppBskyEmbedImages.Main(
            images=[
                models.AppBskyEmbedImages.Image(
                    alt=alt_text,
                    image=blob_resp.blob,
                )
            ]
        )
        
        # Send post with embed
        resp = client.send_post(text=text, embed=embed)
        return {
            "success": True,
            "uri": resp.uri,
            "cid": resp.cid,
        }
    except Exception as e:
        print(f"⚠️ Bluesky image post failed: {e}")
        return {"success": False, "error": str(e)}

