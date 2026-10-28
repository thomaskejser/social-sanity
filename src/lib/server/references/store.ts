import { db } from '../db/index.ts';
import findSql from './sql/find-reference.sql?raw';
import addSql from './sql/add-reference.sql?raw';
import listSql from './sql/list-references.sql?raw';
import moveSql from './sql/move-references.sql?raw';
import buryReferencesSql from './sql/bury-references.sql?raw';
import findTombstoneSql from './sql/find-tombstone.sql?raw';

/** Where an ID comes from. */
export type ReferenceSource = 'GOOGLE_CONTACTS' | 'YOUTUBE' | 'REDDIT';

/** A human, company or channel: a record the user keeps and can convert between kinds. */
export type MemberOwner = { humanId: number } | { companyId: number } | { channelId: number };

/** The master record an outside ID belongs to: exactly one human, company, channel or publisher. */
export type ReferenceOwner = MemberOwner | { publisherId: number };

export type ExternalReference = { source: ReferenceSource; externalReference: string };

const statements = {
	find: db.prepare<
		[{ source: string; external_reference: string }],
		{
			humanId: number | null;
			companyId: number | null;
			channelId: number | null;
			publisherId: number | null;
		}
	>(findSql),
	add: db.prepare(addSql),
	list: db.prepare<[Record<string, number | null>], ExternalReference>(listSql),
	move: db.prepare(moveSql),
	bury: db.prepare(buryReferencesSql),
	findTombstone: db.prepare<[{ source: string; external_reference: string }], { buried: number }>(
		findTombstoneSql
	)
};

function ownerColumns(owner: ReferenceOwner) {
	return {
		human_id: 'humanId' in owner ? owner.humanId : null,
		company_id: 'companyId' in owner ? owner.companyId : null,
		channel_id: 'channelId' in owner ? owner.channelId : null,
		publisher_id: 'publisherId' in owner ? owner.publisherId : null
	};
}

/** The record an outside ID is linked to, if any. */
export function findReference(
	source: ReferenceSource,
	externalReference: string
): ReferenceOwner | undefined {
	const row = statements.find.get({ source, external_reference: externalReference });
	if (!row) return undefined;
	if (row.humanId !== null) return { humanId: row.humanId };
	if (row.companyId !== null) return { companyId: row.companyId };
	if (row.channelId !== null) return { channelId: row.channelId };
	return { publisherId: row.publisherId! };
}

/** Links an outside ID to a record; an ID already linked elsewhere keeps its link. */
export function addReference(
	source: ReferenceSource,
	externalReference: string,
	owner: ReferenceOwner,
	now = Date.now()
) {
	statements.add.run({
		source,
		external_reference: externalReference,
		...ownerColumns(owner),
		now
	});
}

/** Every outside ID collected on a record. */
export function listReferences(owner: ReferenceOwner): ExternalReference[] {
	return statements.list.all(ownerColumns(owner));
}

/** Hands a record's outside IDs to the record that replaces it, e.g. a human turned company. */
export function moveReferences(from: MemberOwner, to: MemberOwner) {
	const target = ownerColumns(to);
	const source = ownerColumns(from);
	statements.move.run({
		human_id: source.human_id,
		company_id: source.company_id,
		channel_id: source.channel_id,
		to_human_id: target.human_id,
		to_company_id: target.company_id,
		to_channel_id: target.channel_id
	});
}

/**
 * Keeps the outside IDs of a human, company or channel being deleted, so imports skip them from
 * then on. Call it before deleting the record, which removes its references.
 */
export function buryReferences(owner: MemberOwner, name: string, now = Date.now()) {
	const { human_id, company_id, channel_id } = ownerColumns(owner);
	statements.bury.run({ human_id, company_id, channel_id, name, now });
}

/** Whether this outside ID belonged to a record the user deleted. */
export function isBuried(source: ReferenceSource, externalReference: string): boolean {
	return !!statements.findTombstone.get({ source, external_reference: externalReference });
}
