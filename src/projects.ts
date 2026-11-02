export function filterProjects<
  T extends { project: { name: string; updatedAt: string } },
>(items: T[], query: string, sort: string): T[] {
  return items
    .filter((item) =>
      item.project.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.project.name.localeCompare(b.project.name)
        : b.project.updatedAt.localeCompare(a.project.updatedAt),
    );
}
