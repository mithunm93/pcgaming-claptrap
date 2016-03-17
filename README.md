# pcgaming-claptrap
A slack integration that posts sales from /r/GameDeals and allows users to check for specific sales

The sale check feature is very similar to Steam's wishlist feature, but it pulls from /r/GameDeals instead. It will run at the same time as the top 5 sales are pulled every morning. If a sale is found, it will be posted to the ot-pcgaming channel, along with an @'username' so that specific user will be notified. When a user checks for a sale, the check is run right away, and the user is notified right away on the channel.

**How it works**:

The game is searched in the /r/GameDeals subreddit, and it looks specifically in the past week. It looks at the first three posts from that search, and tries to match the exact wording (not case-sensitive) to the title of the post.

The post will only be counted as a sale for that game if a portion of the title matches the game keywords provided by the user exactly. For example, a search for 'star wars: battlefront' will not match a title containing 'star wars battlefront'.

How to use it:
The message must begin with "claptrap", this is because this is the trigger word from the Slack integration to send a POST to heroku.
The game in question must be specified in double quotes
The word 'sale' must be used somewhere in the message, outside of the text within the double quotes.

**Examples**:

claptrap get "borderlands" sales          **GOOD**

claptrap sale "borderlands"               **GOOD**

claptrap 'borderlands' sale                 **BAD** - not using double quotes

"borderlands" sales                         **BAD** - not using claptrap trigger

claptrap "borderlands sale"               **BAD** - sale is within the double quotes
