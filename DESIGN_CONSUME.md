# Consume

The consume functionality reads information about channel and people on behalf of the end user.

It then creates a news feed ranked by the source with most Kudos first.

The feed has a heading derived from the data source and a short summary where this is available in the source. 
If the source can be fully read the application presents the full text of the article - this includes embedding the content in an iframe if needed.

If the source cannot be fully read without visiting the web site of the source - a link is shown the clearly indicate that the user will be taken away from the application.

