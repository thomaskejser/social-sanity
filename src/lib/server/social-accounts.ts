import { db } from './db/index.ts';
import type { SocialAccount } from '#lib/social-accounts.ts';
import type { MemberKind } from '#lib/groups/member.ts';
import listHumanSql from './humans/sql/list-social-accounts.sql?raw';
import addHumanSql from './humans/sql/add-social-account.sql?raw';
import deleteHumanSql from './humans/sql/delete-social-account.sql?raw';
import listCompanySql from './companies/sql/list-social-accounts.sql?raw';
import addCompanySql from './companies/sql/add-social-account.sql?raw';
import deleteCompanySql from './companies/sql/delete-social-account.sql?raw';
import listChannelSql from './channels/sql/list-social-accounts.sql?raw';
import addChannelSql from './channels/sql/add-social-account.sql?raw';
import deleteChannelSql from './channels/sql/delete-social-account.sql?raw';

const statements = {
	human: {
		list: db.prepare<[{ human_id: number }], SocialAccount>(listHumanSql),
		add: db.prepare(addHumanSql),
		remove: db.prepare(deleteHumanSql)
	},
	company: {
		list: db.prepare<[{ company_id: number }], SocialAccount>(listCompanySql),
		add: db.prepare(addCompanySql),
		remove: db.prepare(deleteCompanySql)
	},
	channel: {
		list: db.prepare<[{ channel_id: number }], SocialAccount>(listChannelSql),
		add: db.prepare(addChannelSql),
		remove: db.prepare(deleteChannelSql)
	}
};

/** The social media accounts of a human, company or channel. */
export function listSocialAccounts(kind: MemberKind, ownerId: number): SocialAccount[] {
	if (kind === 'human') return statements.human.list.all({ human_id: ownerId });
	if (kind === 'company') return statements.company.list.all({ company_id: ownerId });
	return statements.channel.list.all({ channel_id: ownerId });
}

export function addSocialAccount(
	kind: MemberKind,
	ownerId: number,
	account: { platform: string; url: string }
) {
	statements[kind].add.run({ owner_id: ownerId, ...account });
}

export function removeSocialAccount(kind: MemberKind, ownerId: number, socialAccountId: number) {
	statements[kind].remove.run({ owner_id: ownerId, social_account_id: socialAccountId });
}
