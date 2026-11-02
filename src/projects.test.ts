import { describe, expect, it } from "vitest";
import { filterProjects } from "./projects";
const items = [
  { project: { name: "Mây", updatedAt: "2026-01-01" } },
  { project: { name: "An", updatedAt: "2026-02-01" } },
];
describe("recent projects", () => {
  it("searches without case sensitivity and does not mutate the stored order", () => {
    expect(filterProjects(items, "MÂY", "name")).toEqual([items[0]]);
    expect(items[0].project.name).toBe("Mây");
  });
  it("sorts by name or most recently updated", () => {
    expect(
      filterProjects(items, "", "name").map((x) => x.project.name),
    ).toEqual(["An", "Mây"]);
    expect(
      filterProjects(items, "", "updated").map((x) => x.project.name),
    ).toEqual(["An", "Mây"]);
  });
});
