import { describe, expect, it } from 'vitest';
import { channelFeedUrl, parseClassification } from './classify.ts';

describe('parseClassification', () => {
	it('keeps valid answers for the channels asked about', () => {
		const result = parseClassification(
			{
				channels: [
					{ id: 1, kind: 'HUMAN', name: ' Ada Lovelace ', reason: 'Her own channel' },
					{ id: 2, kind: 'COMPANY', name: 'Acme', reason: 'Brand' },
					{ id: 3, kind: 'CHANNEL', name: 'Toy Poodle Fun', reason: '' }
				]
			},
			[1, 2, 3]
		);
		expect(result.get(1)).toEqual({
			kind: 'HUMAN',
			name: 'Ada Lovelace',
			reason: 'Her own channel'
		});
		expect(result.get(3)?.kind).toBe('CHANNEL');
		expect(result.size).toBe(3);
	});

	it('drops unknown ids, kinds, empty names and repeats', () => {
		const result = parseClassification(
			{
				channels: [
					{ id: 9, kind: 'HUMAN', name: 'Not asked' },
					{ id: 1, kind: 'ROBOT', name: 'X' },
					{ id: 2, kind: 'HUMAN', name: '  ' },
					{ id: 3, kind: 'COMPANY', name: 'First' },
					{ id: 3, kind: 'HUMAN', name: 'Second' }
				]
			},
			[1, 2, 3]
		);
		expect([...result.keys()]).toEqual([3]);
		expect(result.get(3)?.name).toBe('First');
	});

	it('tolerates a missing answer', () => {
		expect(parseClassification(undefined, [1]).size).toBe(0);
	});
});

describe('channelFeedUrl', () => {
	it('builds the Atom feed address', () => {
		expect(channelFeedUrl('UC123')).toBe(
			'https://www.youtube.com/feeds/videos.xml?channel_id=UC123'
		);
	});
});
