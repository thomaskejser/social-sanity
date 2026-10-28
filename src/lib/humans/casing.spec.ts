import { describe, expect, it } from 'vitest';
import { titleCaseName } from './casing.ts';

describe('titleCaseName', () => {
	it('title-cases lowercase and uppercase names', () => {
		expect(titleCaseName('ada lovelace')).toBe('Ada Lovelace');
		expect(titleCaseName('ADA LOVELACE')).toBe('Ada Lovelace');
		expect(titleCaseName('charlotte vang-hansen')).toBe('Charlotte Vang-Hansen');
		expect(titleCaseName("o'brien")).toBe("O'Brien");
		expect(titleCaseName('søren østergård')).toBe('Søren Østergård');
	});

	it('keeps mixed-case words as written', () => {
		expect(titleCaseName('Marcella McKeown')).toBe('Marcella McKeown');
		expect(titleCaseName('leonardo DiCaprio')).toBe('Leonardo DiCaprio');
	});

	it('keeps short abbreviations and joining words', () => {
		expect(titleCaseName('David Powell (SQL)')).toBe('David Powell (SQL)');
		expect(titleCaseName('ABC Flytteforretning')).toBe('ABC Flytteforretning');
		expect(titleCaseName('Adventures in Lebanon')).toBe('Adventures in Lebanon');
		expect(titleCaseName('NOA')).toBe('Noa');
		expect(titleCaseName('Philippe BLONDEAUX')).toBe('Philippe Blondeaux');
	});

	it('keeps credentials after a comma and leaves odd characters alone', () => {
		expect(titleCaseName('Keith Williams, SPHR')).toBe('Keith Williams, SPHR');
		expect(titleCaseName('pedro perfeito, CBIP, MVP')).toBe('Pedro Perfeito, CBIP, MVP');
		expect(titleCaseName('Ersin †nal')).toBe('Ersin †nal');
		expect(titleCaseName('martin (moose)')).toBe('Martin (Moose)');
	});

	it('keeps a leading particle of a family name lowercase', () => {
		expect(titleCaseName('van Lagen', { family: true })).toBe('van Lagen');
		expect(titleCaseName('LAGEN', { family: true })).toBe('Lagen');
	});

	it('keeps particles lowercase inside a name, not at the start', () => {
		expect(titleCaseName('ludwig VAN beethoven')).toBe('Ludwig van Beethoven');
		expect(titleCaseName('van gogh')).toBe('Van Gogh');
	});

	it('keeps possessive and contracted endings lowercase', () => {
		expect(titleCaseName("ADA'S")).toBe("Ada's");
	});

	it('leaves e-mail addresses, domains and numbers alone', () => {
		expect(titleCaseName('azamh@microsoft.com')).toBe('azamh@microsoft.com');
		expect(titleCaseName('jane (jane@example.com)')).toBe('Jane (jane@example.com)');
		expect(titleCaseName('flora2000.com')).toBe('flora2000.com');
		expect(titleCaseName('')).toBe('');
	});
});
