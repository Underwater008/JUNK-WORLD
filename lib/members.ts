import "server-only";

import { randomUUID } from "node:crypto";
import { members as staticMembers } from "@/data/members";
import { getSupabaseServerClient } from "@/lib/supabase";
import { getUniversityById } from "@/lib/universities";
import type { Member } from "@/types";

type MemberRow = {
  id: string;
  name: string;
  title: string;
  university: string;
  university_id: string | null;
  country: string;
  city: string;
  bio: string;
  image: string | null;
  profile_url: string | null;
  website_url: string | null;
  updated_at: string;
  created_at: string;
};

type MemberInput = {
  name: string;
  title: string;
  university: string;
  universityId?: string;
  country: string;
  city: string;
  bio: string;
  image?: string;
  profileUrl?: string;
  websiteUrl?: string;
};

const MEMBER_SELECT =
  "id, name, title, university, university_id, country, city, bio, image, profile_url, website_url, updated_at, created_at";

function mapMemberRow(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    university: row.university,
    universityId: row.university_id ?? undefined,
    country: row.country,
    city: row.city,
    bio: row.bio,
    image: row.image ?? undefined,
    profileUrl: row.profile_url ?? undefined,
    websiteUrl: row.website_url ?? undefined,
  };
}

function normalizeMemberError(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("public.members") ||
    normalized.includes("relation \"members\" does not exist") ||
    normalized.includes("schema cache")
  ) {
    return new Error(
      "Members table is not set up yet. Apply `supabase/members.sql` before using member editing."
    );
  }

  return new Error(errorMessage);
}

async function listMemberRows(): Promise<MemberRow[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("members")
    .select(MEMBER_SELECT)
    .order("created_at", { ascending: true });

  if (error) {
    throw normalizeMemberError(error.message);
  }

  return (data ?? []) as MemberRow[];
}

function mergeMembers(rows: MemberRow[]): Member[] {
  const mappedRows = rows.map(mapMemberRow);
  const rowById = new Map(mappedRows.map((member) => [member.id, member]));
  const knownIds = new Set(staticMembers.map((member) => member.id));

  const mergedStaticMembers = staticMembers.map(
    (member) => rowById.get(member.id) ?? member
  );
  const extraMembers = mappedRows.filter((member) => !knownIds.has(member.id));

  return [...mergedStaticMembers, ...extraMembers];
}

function normalizeOptionalUrl(value: unknown, label: string) {
  const normalized = String(value ?? "").trim();
  if (!normalized) {
    return undefined;
  }

  try {
    new URL(normalized);
    return normalized;
  } catch {
    throw new Error(`${label} must be a valid URL.`);
  }
}

async function normalizeMemberInput(input: unknown): Promise<MemberInput> {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid member data.");
  }

  const data = input as Record<string, unknown>;

  const name = String(data.name ?? "").trim();
  if (!name) {
    throw new Error("Member name is required.");
  }

  const title = String(data.title ?? "").trim();
  const universityIdValue = String(data.universityId ?? "").trim();
  const linkedUniversity = universityIdValue
    ? await getUniversityById(universityIdValue)
    : null;

  if (universityIdValue && !linkedUniversity) {
    throw new Error("Selected university is not in the current JUNK catalog.");
  }

  const university = String(data.university ?? linkedUniversity?.name ?? "").trim();
  if (!university) {
    throw new Error("University name is required.");
  }

  const city = String(data.city ?? linkedUniversity?.city ?? "").trim();
  if (!city) {
    throw new Error("City is required.");
  }

  const country = String(data.country ?? linkedUniversity?.country ?? "").trim();
  if (!country) {
    throw new Error("Country is required.");
  }

  const bio = String(data.bio ?? "").trim();
  const image = String(data.image ?? "").trim() || undefined;
  const profileUrl = normalizeOptionalUrl(data.profileUrl, "Profile URL");
  const websiteUrl = normalizeOptionalUrl(data.websiteUrl, "Website URL");

  return {
    name,
    title,
    university,
    universityId: universityIdValue || undefined,
    country,
    city,
    bio,
    image,
    profileUrl,
    websiteUrl,
  };
}

export async function getMembers(): Promise<Member[]> {
  try {
    const rows = await listMemberRows();
    return mergeMembers(rows);
  } catch {
    return staticMembers;
  }
}

export async function createMember(input: unknown): Promise<Member> {
  const data = await normalizeMemberInput(input);
  const supabase = getSupabaseServerClient();
  const timestamp = new Date().toISOString();
  const { data: inserted, error } = await supabase
    .from("members")
    .insert({
      id: randomUUID(),
      name: data.name,
      title: data.title,
      university: data.university,
      university_id: data.universityId ?? null,
      country: data.country,
      city: data.city,
      bio: data.bio,
      image: data.image ?? null,
      profile_url: data.profileUrl ?? null,
      website_url: data.websiteUrl ?? null,
      updated_at: timestamp,
      created_at: timestamp,
    })
    .select(MEMBER_SELECT)
    .single();

  if (error) {
    throw normalizeMemberError(error.message);
  }

  return mapMemberRow(inserted as MemberRow);
}

export async function updateMember(id: string, input: unknown): Promise<Member> {
  const memberId = id.trim();
  if (!memberId) {
    throw new Error("Member not found.");
  }

  const data = await normalizeMemberInput(input);
  const supabase = getSupabaseServerClient();
  const { data: upserted, error } = await supabase
    .from("members")
    .upsert(
      {
        id: memberId,
        name: data.name,
        title: data.title,
        university: data.university,
        university_id: data.universityId ?? null,
        country: data.country,
        city: data.city,
        bio: data.bio,
        image: data.image ?? null,
        profile_url: data.profileUrl ?? null,
        website_url: data.websiteUrl ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select(MEMBER_SELECT)
    .single();

  if (error) {
    throw normalizeMemberError(error.message);
  }

  return mapMemberRow(upserted as MemberRow);
}
