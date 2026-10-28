# Social Sanity Design

This app serves as a way to shield yourself from the algorithms of social media
and take back control of your life.

It allows you to keep track of the people you care about and plan tasks in your
life alone, or with those people.

The app is a **node.js** application and it uses SQL Lite as its backing database. 
This makes the app hostable in very small web servers and providers (read: you don't 
need the big, corporate cloud runners).

Functionality is grouped in tabs on the left side of the screen with icons for each function.

This design document and the below linked document are written and maintained only by humans and agents must ask for permission to touch these documents.

What is stated in this document is the truth about the design and all decisions here override any other, agent written documents in the repo.

The repo uses the [kejser-skill](https://github.com/thomaskejser/kejser-skill) agent skills.


## Conventions

- "The user" as the person operating the app.
- "Humans": Actual individual in this world and their content feeds. Someone having a personal blog and an Instagram would be considered a single "human" data source
- "Agents":  virtual, AI entities, that serve up content 
- "Companies": legal entities that serve content. This includes news sites
- "Channels": sources of data that are not linked to a specific invidual or company. For example, a channel could be "Toy Poodle Fun on Instagram"
- "Content Source": All information made available by "Humans"m, "Agents", "Companies" and "Channels" the user has integrated
- "Article": A single piece of content from a "content source". Can be both a text and a video.
- "Kudos": The users way to state which "humans", "companies" and "channels" they prefer


## Functionalities
The following functionalities exist for the user.

- [Humans](./DESIGN_HUMANS.md): A master list of everyone the user knows, fully cleaned up
- [Tasks](./DESIGN_TASKS.md): A simple task based interface to remember things
- [Consume](./DESIGN_CONSUME.md): Consuming data sources for your daily, non algorithmic, feed
- [Contribute](./DESIGN_CONTRIBUTE.md): Where the user can share information with others without actually opening the Social Media sites
- [Integrations](./DESIGN_INTEGRATION.md): Where various authentication is set up to 
all the integerated data sources.

The database schema is documented here:

- [Database Design](./DESIGN_DATABASE.md)
