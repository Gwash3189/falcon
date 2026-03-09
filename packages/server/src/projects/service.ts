import { eq } from "drizzle-orm";
import { createDb, type Db } from "../db/connection.js";
import { isUniqueViolation } from "../db/errors.js";
import { type NewProject, type Project, projects } from "../db/schema/index.js";
import { ConflictError } from "../errors.js";
import { listProjectsCommand } from "./commands/list_projects.js";

export async function listProjects() {
  return listProjectsCommand({
    db: createDb(),
  });
}

export async function getProject(db: Db, id: string): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return row ?? null;
}

export async function getProjectBySlug(
  db: Db,
  slug: string,
): Promise<Project | null> {
  const [row] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function createProject(
  db: Db,
  data: Pick<NewProject, "name" | "slug">,
): Promise<Project> {
  try {
    const rows = await db.insert(projects).values(data).returning();
    const row = rows[0];
    if (!row) throw new Error("Insert did not return a row");
    return row;
  } catch (err) {
    if (isUniqueViolation(err))
      throw new ConflictError("A project with that slug already exists");
    throw err;
  }
}

export async function updateProject(
  db: Db,
  id: string,
  data: { name?: string; slug?: string },
): Promise<Project | null> {
  try {
    const rows = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return rows[0] ?? null;
  } catch (err) {
    if (isUniqueViolation(err))
      throw new ConflictError("A project with that slug already exists");
    throw err;
  }
}

export async function deleteProject(db: Db, id: string): Promise<boolean> {
  const result = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });
  return result.length > 0;
}
