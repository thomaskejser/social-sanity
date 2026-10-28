# Humans

A master list of everyone the user knows, fully cleaned up.

This is a fully data model of humans including everything we can know about them.

TODO: What a human is (see Conventions in [DESIGN.md](./DESIGN.md)) and what is stored about each one.

## Kudos

A human can be given between 0 and 10 kudos. 

These are done by clicking on a bar of crowns. 
THe kudos indicator is a separate component.

## Groups

Humans can be grouped. 
New groups can be created from the humans tab and groups can be expanded to show their contents.

Humans can be dragged into groups. A human may be a member of more than one group.

## Data sources

Humans are pulled from Google Contacts. 

The import only adds new contacts; changes made in the app are kept until they are synced back to Google.

See: [Integrations](./DESIGN_INTEGRATION.md).

## Content Sources

A human can have any number of content sources.

This is the information that this human makes available online.

## Properties

| Property | Description |
|---|---|
| First Name | First name |
| Middle Name | Any number of Middle Names |
| Last Name | Last name, if any |
| Nickname | Optionally one or more nicknames |
| Address | Any number of addresses, each with a type indicator. This optionall includes google map locations |
| Phone Number | Any number of phone numbers, each with a type indicator. The phone numbers are always stored with country code prefix |
| Birthday | Optionally, a birtday |
| Special Days | Optional special day, each with a type indicator. The special days do not need to have years but can be only days/months |
| Content Sources | Any number of content sources described by the URI required to reach them |
