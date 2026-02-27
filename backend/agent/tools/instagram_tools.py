from agno.tools import Toolkit


class InstagramToolkit(Toolkit):
    def __init__(self):
        super().__init__(name="instagram_tools")
        self.register(self.send_dm)
        self.register(self.post_comment)
        self.register(self.get_media_info)
        self.register(self.get_recent_followers)

    def send_dm(self, user_id: str, message: str) -> str:
        """Send a direct message to an Instagram user.

        Args:
            user_id: The Instagram user ID to message.
            message: The message text to send.

        Returns:
            Result of the DM send operation.
        """
        from instagram.actions import send_direct_message
        return send_direct_message(user_id, message)

    def post_comment(self, media_id: str, comment_text: str) -> str:
        """Post a comment on an Instagram media post.

        Args:
            media_id: The media ID to comment on.
            comment_text: The comment text to post.

        Returns:
            Result of the comment operation.
        """
        from instagram.actions import post_comment_on_media
        return post_comment_on_media(media_id, comment_text)

    def get_media_info(self, media_id: str) -> str:
        """Get information about a specific Instagram media post including caption and like count.

        Args:
            media_id: The media ID to look up.

        Returns:
            String with media details.
        """
        from instagram.actions import get_media_details
        return get_media_details(media_id)

    def get_recent_followers(self) -> str:
        """Get list of recent followers of the monitored Instagram account.

        Returns:
            String with recent followers list.
        """
        from instagram.actions import get_followers_list
        return get_followers_list()
