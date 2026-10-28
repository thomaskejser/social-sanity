export const MEMBER_KINDS = ['human', 'company', 'channel'] as const;
export type MemberKind = (typeof MEMBER_KINDS)[number];

export function isMemberKind(value: unknown): value is MemberKind {
	return MEMBER_KINDS.includes(value as MemberKind);
}

import type { PresenceAccount } from '#lib/members/presence.ts';

export type Member = {
	kind: MemberKind;
	id: number;
	name: string;
	/** Whether it has a picture under /avatars. */
	avatar?: boolean;
	accounts?: PresenceAccount[];
};

/** The drag-and-drop type carrying a human, company or channel onto a group. */
export const MEMBER_TYPE = 'application/x-member';

export function setDraggedMember(transfer: DataTransfer | null, member: Member) {
	transfer?.setData(MEMBER_TYPE, JSON.stringify(member));
}

/** The member being dropped, or undefined when the drop carries something else. */
export function draggedMember(transfer: DataTransfer | null): Member | undefined {
	const raw = transfer?.getData(MEMBER_TYPE);
	if (!raw) return undefined;
	const value = JSON.parse(raw) as Partial<Member>;
	if (!isMemberKind(value.kind) || typeof value.id !== 'number') return undefined;
	return { kind: value.kind, id: value.id, name: String(value.name ?? '') };
}

export function isMemberDrag(transfer: DataTransfer | null): boolean {
	return !!transfer?.types.includes(MEMBER_TYPE);
}
