export type ContactDetail = { type: string; value: string; mapUrl?: string };

/** Everything an external contact store can tell about a human. */
export type HumanContact = {
	human: string;
	firstName: string;
	middleNames: string[];
	familyName: string;
	birthday: string;
	nicknames: ContactDetail[];
	phones: ContactDetail[];
	addresses: ContactDetail[];
	specialDays: ContactDetail[];
	uris: string[];
};
