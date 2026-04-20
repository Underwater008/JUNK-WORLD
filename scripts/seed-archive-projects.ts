import fs from "node:fs";
import path from "node:path";
import postgres, { type JSONValue } from "postgres";
import { universities } from "../data/mock";

type ProjectSeedDocument = {
  slug: string;
  universityId: string;
  worldId: string;
  title: string;
  summary: string;
  year: number;
  tags: string[];
  coverImageUrl: string;
  cardImageUrl: string;
  gallery: Array<{ url: string; alt: string }>;
  participantsCount: number;
  markerOffset: { lat: number; lng: number };
  locationLabel: string;
  collaborators: Array<{ name: string; role: string }>;
  credits: Array<{ label: string; value: string }>;
  externalLinks: Array<{ label: string; url: string }>;
  body: Array<Record<string, unknown>>;
};

const DB_ENV_CANDIDATES = [
  "DATABASE_URL",
  "SUPABASE_DB_URL",
  "SUPABASE_DIRECT_CONNECTION_STRING",
  "SUPABASE DIRECT CONNECTION STRING",
];

function parseDotEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;

  const equalsIndex = trimmed.indexOf("=");
  if (equalsIndex === -1) return null;

  const key = trimmed.slice(0, equalsIndex).trim();
  let value = trimmed.slice(equalsIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value] as const;
}

function readEnvFile(filePath: string) {
  const envMap = new Map<string, string>();
  if (!fs.existsSync(filePath)) return envMap;

  const fileContents = fs.readFileSync(filePath, "utf8");
  for (const line of fileContents.split(/\r?\n/)) {
    const parsed = parseDotEnvLine(line);
    if (!parsed) continue;
    const [key, value] = parsed;
    envMap.set(key, value);
  }

  return envMap;
}

function getDbUrl() {
  for (const candidate of DB_ENV_CANDIDATES) {
    const runtimeValue = process.env[candidate];
    if (runtimeValue) return runtimeValue;
  }

  const cwd = process.cwd();
  const envFiles = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
  ];

  for (const candidate of DB_ENV_CANDIDATES) {
    for (const filePath of envFiles) {
      const fileValue = readEnvFile(filePath).get(candidate);
      if (fileValue) return fileValue;
    }
  }

  return "";
}

function createBody(summary: string) {
  if (!summary.trim()) {
    return [
      {
        type: "paragraph",
        content: [],
      },
    ];
  }

  return [
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: summary.trim(),
          styles: {},
        },
      ],
    },
  ];
}

function toJsonValue(value: ProjectSeedDocument) {
  return JSON.parse(JSON.stringify(value)) as JSONValue;
}

function toSeedDocument(
  universityId: string,
  worldId: string,
  university: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  },
  project: {
    id: string;
    title: string;
    description: string;
    year: number;
    thumbnail: string;
    participants: number;
    tags: string[];
    markerOffset?: { lat: number; lng: number };
  }
): ProjectSeedDocument {
  const summary = project.description.trim();

  return {
    slug: project.id,
    universityId,
    worldId,
    title: project.title.trim(),
    summary,
    year: project.year,
    tags: project.tags,
    coverImageUrl: project.thumbnail,
    cardImageUrl: project.thumbnail,
    gallery: [],
    participantsCount: project.participants,
    markerOffset: project.markerOffset ?? {
      lat: university.lat,
      lng: university.lng,
    },
    locationLabel: `${university.city}, ${university.country}`,
    collaborators: [],
    credits: [],
    externalLinks: [],
    body: createBody(summary),
  };
}

async function main() {
  const dbUrl = getDbUrl();

  if (!dbUrl) {
    throw new Error(
      "Database connection string is missing. Set DATABASE_URL or SUPABASE DIRECT CONNECTION STRING."
    );
  }

  const archiveProjects = universities.flatMap((university) =>
    university.worlds.flatMap((world) =>
      world.projects.map((project) => ({
        recordId: `archive:${university.id}:${world.id}:${project.id}`,
        slug: project.id,
        universityId: university.id,
        worldId: world.id,
        document: toSeedDocument(university.id, world.id, university, project),
      }))
    )
  );

  if (!archiveProjects.length) {
    console.log("No archive projects found in data/mock.ts.");
    return;
  }

  const sql = postgres(dbUrl, {
    ssl: "require",
    prepare: false,
    onnotice: () => {},
  });

  try {
    await sql`
      create table if not exists projects (
        id text primary key,
        slug text not null unique,
        university_id text not null,
        draft_content jsonb,
        published_content jsonb,
        published_at timestamptz,
        updated_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );
    `;
    await sql`create index if not exists projects_university_idx on projects (university_id);`;
    await sql`create index if not exists projects_published_idx on projects (published_at desc);`;

    const existingSlugs = await sql<{ slug: string }[]>`
      select slug
      from projects
      where slug in ${sql(archiveProjects.map((entry) => entry.slug))};
    `;

    const existingSlugSet = new Set(existingSlugs.map((row) => row.slug));
    let inserted = 0;
    let updated = 0;

    for (const entry of archiveProjects) {
      if (existingSlugSet.has(entry.slug)) {
        updated += 1;
      } else {
        inserted += 1;
      }

      await sql`
        insert into projects (
          id,
          slug,
          university_id,
          draft_content,
          published_content,
          published_at,
          updated_at,
          created_at
        )
        values (
          ${entry.recordId},
          ${entry.slug},
          ${entry.universityId},
          ${sql.json(toJsonValue(entry.document))},
          ${sql.json(toJsonValue(entry.document))},
          now(),
          now(),
          now()
        )
        on conflict (slug) do update
        set university_id = excluded.university_id,
            draft_content = excluded.draft_content,
            published_content = excluded.published_content,
            published_at = excluded.published_at,
            updated_at = now();
      `;
    }

    const seededRows = await sql<{
      slug: string;
      title: string;
      university_id: string;
    }[]>`
      select
        slug,
        published_content->>'title' as title,
        university_id
      from projects
      where slug in ${sql(archiveProjects.map((entry) => entry.slug))}
      order by university_id asc, slug asc;
    `;

    console.log(
      JSON.stringify(
        {
          inserted,
          updated,
          totalSeeded: seededRows.length,
          projects: seededRows,
        },
        null,
        2
      )
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
