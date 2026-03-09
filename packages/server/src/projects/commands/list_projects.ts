import { command } from "@falcon/shared";
import type { Db } from "../../db/connection.js";
import { type Project, projects } from "../../db/schema/index.js";

export type Dependencies = {
  db: Db;
};
export type Params = {};

export const listProjectsCommand = command<
  Dependencies,
  Params,
  Promise<Project[]>
>(async ({ dependencies }) => {
  const { db } = dependencies;
  return db.select().from(projects).orderBy(projects.createdAt);
});
