import { db } from '../db/index.ts';
import type { MemberOwner, ReferenceSource } from '../references/store.ts';
import addSql from './sql/add-avatar.sql?raw';
import deleteSql from './sql/delete-avatar.sql?raw';
import getSql from './sql/get-avatar.sql?raw';
import moveSql from './sql/move-avatar.sql?raw';
import listMissingSql from './sql/list-missing.sql?raw';
import getHumanSql from './sql/get-human-avatar.sql?raw';
import listHumanSql from './sql/list-human-avatars.sql?raw';
import addHumanSql from './sql/add-human-avatar.sql?raw';
import deleteHumanSql from './sql/delete-human-avatar.sql?raw';
import showHumanSql from './sql/show-human-avatar.sql?raw';
import dropSharedHumanSql from './sql/drop-shared-human-avatars.sql?raw';
import moveHumanSql from './sql/move-human-avatars.sql?raw';
import humanToAvatarSql from './sql/human-avatar-to-avatar.sql?raw';
import avatarToHumanSql from './sql/avatar-to-human-avatar.sql?raw';

const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type Avatar = { contentType: string; image: Buffer };

/** A record that has an outside ID but no picture yet. */
export type MissingAvatar = {
	source: ReferenceSource;
	externalReference: string;
	owner: MemberOwner;
	/** The channel picture YouTube gave on import; '' for other sources. */
	youtubeThumbnail: string;
};

const statements = {
	add: db.prepare(addSql),
	delete: db.prepare(deleteSql),
	get: db.prepare<[Record<string, number | null>], Avatar>(getSql),
	move: db.prepare(moveSql),
	listMissing: db.prepare<
		[],
		{
			source: MissingAvatar['source'];
			externalReference: string;
			humanId: number | null;
			companyId: number | null;
			channelId: number | null;
			youtubeThumbnail: string;
		}
	>(listMissingSql),
	getHuman: db.prepare<[{ human_id: number; human_avatar_id: number | null }], Avatar>(getHumanSql),
	listHuman: db.prepare<[{ human_id: number }], HumanAvatar>(listHumanSql),
	addHuman: db.prepare(addHumanSql),
	deleteHuman: db.prepare(deleteHumanSql),
	showHuman: db.prepare(showHumanSql),
	dropSharedHuman: db.prepare(dropSharedHumanSql),
	moveHuman: db.prepare(moveHumanSql),
	humanToAvatar: db.prepare(humanToAvatarSql),
	avatarToHuman: db.prepare(avatarToHumanSql)
};

/** One of a human's pictures; a company or channel has one picture only. */
export type HumanAvatar = { humanAvatarId: number; sourceUrl: string };

function ownerIds(owner: MemberOwner) {
	return {
		company_id: 'companyId' in owner ? owner.companyId : null,
		channel_id: 'channelId' in owner ? owner.channelId : null
	};
}

/** The picture shown for a record. */
export function getAvatar(owner: MemberOwner): Avatar | undefined {
	if ('humanId' in owner)
		return statements.getHuman.get({ human_id: owner.humanId, human_avatar_id: null });
	return statements.get.get(ownerIds(owner));
}

/**
 * Gives a record a picture. A human gains it next to their others, unless they have one from that
 * address, and it is shown when it is their first; a company or channel has it replace its own.
 */
export const saveAvatar = db.transaction(
	(owner: MemberOwner, avatar: Avatar, sourceUrl: string, now = Date.now()) => {
		const picture = {
			content_type: avatar.contentType,
			image: avatar.image,
			source_url: sourceUrl,
			now
		};
		if ('humanId' in owner) {
			statements.addHuman.run({ human_id: owner.humanId, ...picture });
			return;
		}
		statements.delete.run(ownerIds(owner));
		statements.add.run({ ...ownerIds(owner), ...picture });
	}
);

export function listHumanAvatars(humanId: number): HumanAvatar[] {
	return statements.listHuman.all({ human_id: humanId });
}

export function getHumanAvatar(humanId: number, humanAvatarId: number): Avatar | undefined {
	return statements.getHuman.get({ human_id: humanId, human_avatar_id: humanAvatarId });
}

export function deleteHumanAvatar(humanId: number, humanAvatarId: number) {
	statements.deleteHuman.run({ human_id: humanId, human_avatar_id: humanAvatarId });
}

/** Makes one of a human's pictures the one shown. */
export function showHumanAvatar(humanId: number, humanAvatarId: number) {
	statements.showHuman.run({ human_id: humanId, human_avatar_id: humanAvatarId });
}

/**
 * Hands a record's pictures to the record that replaces it. A human passes all of theirs to a
 * human, and the one shown to a company or channel that has none; a company or channel passes its
 * picture to a human, or to a company or channel. The old record's pictures go with it when it is
 * deleted.
 */
export const moveAvatar = db.transaction((from: MemberOwner, to: MemberOwner) => {
	if ('humanId' in from && 'humanId' in to) {
		const ids = { human_id: from.humanId, to_human_id: to.humanId };
		statements.dropSharedHuman.run(ids);
		statements.moveHuman.run(ids);
		return;
	}
	if ('humanId' in from) {
		const target = ownerIds(to);
		statements.humanToAvatar.run({
			human_id: from.humanId,
			to_company_id: target.company_id,
			to_channel_id: target.channel_id
		});
		return;
	}
	if ('humanId' in to) {
		statements.avatarToHuman.run({ ...ownerIds(from), to_human_id: to.humanId });
		statements.delete.run(ownerIds(from));
		return;
	}
	if (getAvatar(to)) return;
	const target = ownerIds(to);
	statements.move.run({
		...ownerIds(from),
		to_company_id: target.company_id,
		to_channel_id: target.channel_id
	});
});

/** Records with an outside ID and no picture, one row per outside ID. */
export function listMissingAvatars(): MissingAvatar[] {
	return statements.listMissing.all().map((row) => ({
		source: row.source,
		externalReference: row.externalReference,
		youtubeThumbnail: row.youtubeThumbnail,
		owner:
			row.humanId !== null
				? { humanId: row.humanId }
				: row.companyId !== null
					? { companyId: row.companyId }
					: { channelId: row.channelId! }
	}));
}

/**
 * Downloads a picture from Google or YouTube. Only https, only common image types, at most 2 MB,
 * and at most 10 seconds; anything else fails.
 */
export async function downloadAvatar(url: string): Promise<Avatar> {
	if (new URL(url).protocol !== 'https:') throw new Error(`Not an https address: ${url}`);
	const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
	const contentType = (response.headers.get('content-type') ?? '').split(';')[0].trim();
	if (!response.ok || !IMAGE_TYPES.includes(contentType)) {
		await response.body?.cancel();
		throw new Error(
			response.ok ? `Not an image (${contentType}): ${url}` : `${response.status} for ${url}`
		);
	}
	const image = Buffer.from(await response.arrayBuffer());
	if (image.length > MAX_BYTES) throw new Error(`Picture too large: ${url}`);
	return { contentType, image };
}
