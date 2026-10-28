import { db } from '../db/index.ts';
import { readPresence, type Presence } from '#lib/members/presence.ts';
import type { Detail } from '#lib/humans/details.ts';
import { buryReferences } from '../references/store.ts';
import listSql from './sql/list-companies.sql?raw';
import countSql from './sql/count-companies.sql?raw';
import countUngroupedSql from './sql/count-ungrouped.sql?raw';
import listUngroupedSql from './sql/list-ungrouped.sql?raw';
import getSql from './sql/get-company.sql?raw';
import findByNameSql from './sql/find-company-by-name.sql?raw';
import createSql from './sql/create-company.sql?raw';
import updateSql from './sql/update-company.sql?raw';
import deleteSql from './sql/delete-company.sql?raw';
import setKudosSql from './sql/set-kudos.sql?raw';
import renameSql from './sql/rename-company.sql?raw';
import listAddressesSql from './sql/list-addresses.sql?raw';
import addAddressSql from './sql/add-address.sql?raw';
import deleteAddressSql from './sql/delete-address.sql?raw';
import listPhonesSql from './sql/list-phones.sql?raw';
import addPhoneSql from './sql/add-phone.sql?raw';
import deletePhoneSql from './sql/delete-phone.sql?raw';
import addMemberSql from './sql/add-member.sql?raw';
import removeMemberSql from './sql/remove-member.sql?raw';
import removeFromAllGroupsSql from './sql/remove-from-all-groups.sql?raw';

export type CompanySummary = {
	companyId: number;
	company: string;
	kudos: number;
	fromGoogle: boolean;
	groupIds: number[];
} & Presence;

export type Company = {
	companyId: number;
	/** Display name. */
	company: string;
	website: string;
	notes: string;
	kudos: number;
};

export type CompanyInput = { company: string; website: string; notes: string };

/** The details a company holds; phone numbers and addresses work as for humans. */
export type CompanyDetailKind = 'phone' | 'address';

export function isCompanyDetailKind(value: unknown): value is CompanyDetailKind {
	return value === 'phone' || value === 'address';
}

const statements = {
	list: db.prepare<
		[{ search: string; limit: number; offset: number }],
		{
			companyId: number;
			company: string;
			kudos: number;
			fromGoogle: number;
			groupIds: string;
			avatar: number;
			accounts: string;
		}
	>(listSql),
	count: db.prepare<[{ search: string }], { total: number }>(countSql),
	countUngrouped: db.prepare<[], { total: number }>(countUngroupedSql),
	listUngrouped: db.prepare<
		[{ limit: number; offset: number }],
		{ id: number; name: string; avatar: number; accounts: string }
	>(listUngroupedSql),
	get: db.prepare<[{ company_id: number }], Company>(getSql),
	findByName: db.prepare<[{ name: string }], { companyId: number }>(findByNameSql),
	create: db.prepare<[Record<string, unknown>], { companyId: number }>(createSql),
	update: db.prepare(updateSql),
	delete: db.prepare(deleteSql),
	setKudos: db.prepare(setKudosSql),
	rename: db.prepare(renameSql),
	addMember: db.prepare(addMemberSql),
	removeMember: db.prepare(removeMemberSql),
	removeFromAllGroups: db.prepare(removeFromAllGroupsSql)
};

const details = {
	phone: {
		list: db.prepare<[{ company_id: number }], Detail>(listPhonesSql),
		add: db.prepare(addPhoneSql),
		remove: db.prepare(deletePhoneSql)
	},
	address: {
		list: db.prepare<[{ company_id: number }], Detail>(listAddressesSql),
		add: db.prepare(addAddressSql),
		remove: db.prepare(deleteAddressSql)
	}
};

/** Companies whose name contains `search` (any case), names starting with it first. */
export function listCompanies(search: string, limit: number, offset: number): CompanySummary[] {
	return statements.list.all({ search, limit, offset }).map((row) => ({
		...readPresence(row),
		fromGoogle: row.fromGoogle === 1,
		groupIds: JSON.parse(row.groupIds) as number[]
	}));
}

export function countCompanies(search: string): number {
	return statements.count.get({ search })!.total;
}

export function countUngroupedCompanies(): number {
	return statements.countUngrouped.get()!.total;
}

/** Companies in no group, in name order. */
export function listUngroupedCompanies(limit: number, offset: number) {
	return statements.listUngrouped.all({ limit, offset }).map(readPresence);
}

export function getCompany(companyId: number): Company | undefined {
	return statements.get.get({ company_id: companyId });
}

/** The first company named `name`, ignoring case. */
export function findCompanyByName(name: string): number | undefined {
	return statements.findByName.get({ name })?.companyId;
}

export function createCompany(input: CompanyInput, now = Date.now()): number {
	return statements.create.get({
		...input,
		kudos: 0,
		now
	})!.companyId;
}

export function updateCompany(companyId: number, input: CompanyInput, now = Date.now()) {
	statements.update.run({ ...input, company_id: companyId, now });
}

/** Deletes a company. Its outside IDs are kept as tombstones, so imports don't bring it back. */
export const deleteCompany = db.transaction((companyId: number, now = Date.now()) => {
	const company = getCompany(companyId);
	if (!company) return;
	buryReferences({ companyId }, company.company, now);
	statements.delete.run({ company_id: companyId });
});

export function renameCompany(companyId: number, name: string, now = Date.now()) {
	statements.rename.run({ company_id: companyId, name, now });
}

export function setCompanyKudos(companyId: number, kudos: number) {
	statements.setKudos.run({ company_id: companyId, kudos });
}

export function listCompanyDetails(companyId: number, kind: CompanyDetailKind): Detail[] {
	return details[kind].list.all({ company_id: companyId });
}

export function addCompanyDetail(
	companyId: number,
	kind: CompanyDetailKind,
	detail: { type: string; value: string; mapUrl?: string }
) {
	details[kind].add.run({
		company_id: companyId,
		type: detail.type,
		value: detail.value,
		...(kind === 'address' ? { map_url: detail.mapUrl ?? '' } : {})
	});
}

export function removeCompanyDetail(companyId: number, kind: CompanyDetailKind, detailId: number) {
	details[kind].remove.run({ company_id: companyId, detail_id: detailId });
}

export function addCompanyMember(humanGroupId: number, companyId: number) {
	statements.addMember.run({ human_group_id: humanGroupId, company_id: companyId });
}

export function removeCompanyMember(humanGroupId: number, companyId: number) {
	statements.removeMember.run({ human_group_id: humanGroupId, company_id: companyId });
}

export function removeCompanyFromAllGroups(companyId: number) {
	statements.removeFromAllGroups.run({ company_id: companyId });
}

export const moveCompanyMember = db.transaction(
	(fromGroupId: number, toGroupId: number, companyId: number) => {
		addCompanyMember(toGroupId, companyId);
		removeCompanyMember(fromGroupId, companyId);
	}
);
