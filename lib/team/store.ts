import { randomUUID } from "crypto";
import {
  type MerchantRole,
  type TeamAuditEntry,
  type TeamMember,
} from "./types";

/**
 * In-memory merchant team store + audit log (issue #465).
 *
 * Process-local, seeded with a demo team per merchant id — the same shape a
 * `merchant_team_members` / `merchant_team_audit` table would hold. Replace
 * with the backend's `/api/merchants/:id/team` service before production;
 * the route handlers here are a working reference for the contract and the
 * audit requirement.
 */

interface TeamState {
  members: Map<string, TeamMember>;
  audit: TeamAuditEntry[];
}

const g = globalThis as unknown as { __bpTeams?: Map<string, TeamState> };
const teams = (g.__bpTeams ??= new Map<string, TeamState>());

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function seed(merchantId: string): TeamState {
  const now = new Date().toISOString();
  const members = new Map<string, TeamMember>();
  const owner: TeamMember = {
    id: randomUUID(),
    email: "owner@bettapay.com",
    name: "Merchant Owner",
    role: "owner",
    status: "active",
    invitedAt: now,
    acceptedAt: now,
    lastActiveAt: now,
  };
  members.set(owner.id, owner);
  return { members, audit: [] };
}

function stateFor(merchantId: string): TeamState {
  let state = teams.get(merchantId);
  if (!state) {
    state = seed(merchantId);
    teams.set(merchantId, state);
  }
  return state;
}

function record(
  state: TeamState,
  entry: Omit<TeamAuditEntry, "id" | "at">,
): void {
  state.audit.unshift({ id: randomUUID(), at: new Date().toISOString(), ...entry });
}

export function listTeam(merchantId: string): {
  members: TeamMember[];
  audit: TeamAuditEntry[];
} {
  const state = stateFor(merchantId);
  return {
    members: [...state.members.values()].sort((a, b) =>
      a.invitedAt < b.invitedAt ? -1 : 1,
    ),
    audit: state.audit.slice(0, 50),
  };
}

export function inviteMember(
  merchantId: string,
  actor: string,
  email: string,
  role: MerchantRole,
): { ok: true; member: TeamMember } | { ok: false; error: string } {
  const state = stateFor(merchantId);
  const normalized = email.trim().toLowerCase();
  if ([...state.members.values()].some((m) => m.email === normalized && m.status !== "revoked")) {
    return { ok: false, error: "That email is already on the team." };
  }
  const member: TeamMember = {
    id: randomUUID(),
    email: normalized,
    role,
    status: "pending",
    invitedAt: new Date().toISOString(),
  };
  state.members.set(member.id, member);
  record(state, {
    actor,
    action: "member.invited",
    targetEmail: normalized,
    detail: `invited as ${role}`,
  });
  return { ok: true, member };
}

/** Simulates an invitee following the acceptance link. */
export function acceptInvite(
  merchantId: string,
  memberId: string,
): { ok: true; member: TeamMember } | { ok: false; error: string } {
  const state = stateFor(merchantId);
  const member = state.members.get(memberId);
  if (!member) return { ok: false, error: "Member not found." };
  if (member.status !== "pending") return { ok: false, error: "Invite is not pending." };
  member.status = "active";
  member.acceptedAt = new Date().toISOString();
  member.lastActiveAt = member.acceptedAt;
  record(state, { actor: member.email, action: "member.accepted", targetEmail: member.email });
  return { ok: true, member };
}

export function changeRole(
  merchantId: string,
  actor: string,
  memberId: string,
  role: MerchantRole,
): { ok: true; member: TeamMember } | { ok: false; error: string } {
  const state = stateFor(merchantId);
  const member = state.members.get(memberId);
  if (!member) return { ok: false, error: "Member not found." };
  if (member.role === "owner") return { ok: false, error: "The owner role cannot be changed here." };
  const from = member.role;
  member.role = role;
  record(state, {
    actor,
    action: "member.role_changed",
    targetEmail: member.email,
    detail: `${from} -> ${role}`,
  });
  return { ok: true, member };
}

export function removeMember(
  merchantId: string,
  actor: string,
  memberId: string,
): { ok: true } | { ok: false; error: string } {
  const state = stateFor(merchantId);
  const member = state.members.get(memberId);
  if (!member) return { ok: false, error: "Member not found." };
  if (member.role === "owner") return { ok: false, error: "The owner cannot be removed." };
  member.status = "revoked";
  record(state, { actor, action: "member.removed", targetEmail: member.email });
  return { ok: true };
}
