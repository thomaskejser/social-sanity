/** Name particles that stay lowercase inside a name, as in "Ludwig van Beethoven". */
const PARTICLES = new Set([
	'af',
	'al',
	'bin',
	'da',
	'das',
	'de',
	'del',
	'della',
	'den',
	'der',
	'di',
	'do',
	'dos',
	'du',
	'la',
	'le',
	'ten',
	'ter',
	'van',
	'von',
	'zu'
]);

function capitalize(part: string): string {
	return part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase();
}

/** A word is changed only when it is all lowercase or all uppercase; "McKeown" is kept. */
function needsCasing(word: string): boolean {
	return word === word.toLocaleLowerCase() || word === word.toLocaleUpperCase();
}

/** Words of this length or shorter are left as written when they look deliberate. */
const SHORT = 3;

/** Letters after these start a new part of a name: "Vang-Hansen", "O'Brien", "(Moose)". */
const PART_START = new Set(['-', "'", '(', '"']);

function caseWord(
	word: string,
	{ first, allCaps, suffix }: { first: boolean; allCaps: boolean; suffix: boolean }
): string {
	if (/[@\d]/.test(word) || /\.[a-z]/i.test(word) || !/\p{L}/u.test(word)) return word;
	if (!needsCasing(word)) return word;
	const lower = word.toLocaleLowerCase();
	const letters = word.replace(/[^\p{L}]/gu, '');
	if (!first && PARTICLES.has(lower)) return lower;
	// "Keith Williams, SPHR": capitals after a comma are credentials.
	if (suffix && word === word.toLocaleUpperCase()) return word;
	// "ABC", "SQL": short words in capitals are abbreviations, unless the whole name is shouted.
	if (!allCaps && word === word.toLocaleUpperCase() && letters.length <= SHORT) return word;
	// "in", "on", "og": short lowercase words after the first are joining words.
	if (!first && word === lower && letters.length <= SHORT - 1) return word;
	return lower.replace(/\p{L}+/gu, (part, offset: number) => {
		const before = lower[offset - 1];
		if (offset === 0 || (PART_START.has(before) && !(before === "'" && part.length === 1)))
			return capitalize(part);
		return part;
	});
}

/**
 * Title-cases a name: "ada LOVELACE" → "Ada Lovelace", "charlotte vang-hansen" →
 * "Charlotte Vang-Hansen". Words already in mixed case, short abbreviations such as "SQL", short
 * joining words such as "in", e-mail addresses and anything with digits are left as they are.
 * With `family`, a leading particle stays lowercase too ("van Lagen").
 */
export function titleCaseName(name: string, { family = false } = {}): string {
	const allCaps = /\p{L}/u.test(name) && name === name.toLocaleUpperCase();
	let first = !family;
	let suffix = false;
	return name.replace(/\S+/g, (word) => {
		const cased = caseWord(word, { first, allCaps, suffix });
		first = false;
		suffix ||= word.endsWith(',');
		return cased;
	});
}
