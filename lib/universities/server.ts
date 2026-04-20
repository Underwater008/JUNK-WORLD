import "server-only";

import { getSql } from "@/lib/db";
import { slugify } from "@/lib/utils";
import type { University } from "@/types";

type UniversityRow = {
  id: string;
  name: string;
  short_name: string;
  city: string;
  lat: number;
  lng: number;
  color: string;
  country: string;
  disciplines: string[];
  logo: string | null;
  status: string;
  updated_at: string;
  created_at: string;
};

function mapRow(row: UniversityRow): University {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    color: row.color,
    country: row.country,
    disciplines: row.disciplines ?? [],
    worlds: [],
    logo: row.logo ?? undefined,
    status: (row.status as "active" | "inactive") ?? "active",
  };
}

export interface UniversityInput {
  name: string;
  shortName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  color: string;
  disciplines: string[];
  logo?: string;
  status: "active" | "inactive";
}

function validateUniversityInput(input: unknown): UniversityInput {
  if (!input || typeof input !== "object") {
    throw new Error("Invalid university data.");
  }

  const data = input as Record<string, unknown>;

  const name = String(data.name ?? "").trim();
  if (!name) throw new Error("University name is required.");

  const shortName = String(data.shortName ?? "").trim();
  if (!shortName) throw new Error("Short name is required.");

  const city = String(data.city ?? "").trim();
  if (!city) throw new Error("City is required.");

  const country = String(data.country ?? "").trim();
  if (!country) throw new Error("Country is required.");

  const lat = Number(data.lat);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }

  const lng = Number(data.lng);
  if (Number.isNaN(lng) || lng < -180 || lng > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }

  const color = String(data.color ?? "#000000").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    throw new Error("Color must be a valid hex color (e.g. #FF0000).");
  }

  const rawDisciplines = Array.isArray(data.disciplines) ? data.disciplines : [];
  const disciplines = rawDisciplines
    .map((d) => String(d).trim())
    .filter(Boolean);

  const logo = data.logo ? String(data.logo).trim() : undefined;

  const status = data.status === "inactive" ? "inactive" : "active";

  return { name, shortName, city, country, lat, lng, color, disciplines, logo, status };
}

export async function getAllUniversities(): Promise<University[]> {
  const sql = getSql();
  const rows = await sql<UniversityRow[]>`
    select id, name, short_name, city, lat, lng, color, country, disciplines, logo, status, updated_at, created_at
    from universities
    order by
      case when status = 'active' then 0 else 1 end,
      name;
  `;

  return rows.map(mapRow);
}

export async function getUniversityByIdFromDb(id: string): Promise<University | null> {
  const sql = getSql();
  const rows = await sql<UniversityRow[]>`
    select id, name, short_name, city, lat, lng, color, country, disciplines, logo, status, updated_at, created_at
    from universities
    where id = ${id}
    limit 1;
  `;

  return rows[0] ? mapRow(rows[0]) : null;
}

export async function createUniversity(input: unknown): Promise<University> {
  const data = validateUniversityInput(input);
  const id = slugify(data.name);

  if (!id) {
    throw new Error("Could not generate a valid ID from the university name.");
  }

  const sql = getSql();
  const inserted = await sql<UniversityRow[]>`
    insert into universities (id, name, short_name, city, lat, lng, color, country, disciplines, logo, status)
    values (
      ${id},
      ${data.name},
      ${data.shortName},
      ${data.city},
      ${data.lat},
      ${data.lng},
      ${data.color},
      ${data.country},
      ${sql.array(data.disciplines)},
      ${data.logo ?? null},
      ${data.status}
    )
    returning id, name, short_name, city, lat, lng, color, country, disciplines, logo, status, updated_at, created_at;
  `;

  return mapRow(inserted[0]);
}

export async function updateUniversity(id: string, input: unknown): Promise<University> {
  const data = validateUniversityInput(input);

  const sql = getSql();
  const updated = await sql<UniversityRow[]>`
    update universities
    set name = ${data.name},
        short_name = ${data.shortName},
        city = ${data.city},
        country = ${data.country},
        lat = ${data.lat},
        lng = ${data.lng},
        color = ${data.color},
        disciplines = ${sql.array(data.disciplines)},
        logo = ${data.logo ?? null},
        status = ${data.status},
        updated_at = now()
    where id = ${id}
    returning id, name, short_name, city, lat, lng, color, country, disciplines, logo, status, updated_at, created_at;
  `;

  if (updated.length === 0) {
    throw new Error("University not found.");
  }

  return mapRow(updated[0]);
}

export async function deleteUniversity(id: string): Promise<void> {
  const sql = getSql();

  const worldCount = await sql`
    select count(*)::int as count from worlds where university_id = ${id};
  `;
  if (worldCount[0]?.count > 0) {
    throw new Error(
      `Cannot delete: ${worldCount[0].count} world(s) still reference this university. Reassign or delete them first.`
    );
  }

  const projectCount = await sql`
    select count(*)::int as count from projects where university_id = ${id};
  `;
  if (projectCount[0]?.count > 0) {
    throw new Error(
      `Cannot delete: ${projectCount[0].count} project(s) still reference this university. Reassign or delete them first.`
    );
  }

  const deleted = await sql`
    delete from universities where id = ${id} returning id;
  `;

  if (deleted.length === 0) {
    throw new Error("University not found.");
  }
}
