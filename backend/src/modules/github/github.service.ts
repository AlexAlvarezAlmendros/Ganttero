import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { ItemsService } from "../items/items.service.js";
import type { ProjectsRepo } from "../projects/projects.repo.js";
import type { GitHubClient } from "./github.client.js";
import type { GithubRepo } from "./github.repo.js";
import type { GithubLink, RepoActivity } from "./github.schema.js";

/** Smart commits: «GP-42 avanza el parser» enlaza; «fixes GP-42» además cierra. */
const KEY_PATTERN = /\b([A-Z][A-Z0-9]{0,5})-(\d+)\b/g;
const CLOSE_PATTERN =
	/\b(?:fixes|closes|resolves|cierra|resuelve|termina)\s+([A-Z][A-Z0-9]{0,5}-\d+)\b/gi;

export class GithubService {
	constructor(
		private readonly repo: GithubRepo,
		private readonly projectsRepo: ProjectsRepo,
		private readonly client: GitHubClient,
		/** El cierre pasa por ItemsService para que dispare el cronometraje. */
		private readonly itemsService: ItemsService,
		private readonly now: () => Date = () => new Date(),
		private readonly log: (message: string) => void = () => {},
	) {}

	async listLinks(projectId: number): Promise<GithubLink[]> {
		await this.assertProject(projectId);
		return this.repo.listLinks(projectId);
	}

	async link(projectId: number, repoFullName: string): Promise<GithubLink> {
		await this.assertProject(projectId);
		const existing = await this.repo.listLinks(projectId);
		if (existing.some((link) => link.repo_full_name === repoFullName)) {
			throw new ConflictError(`${repoFullName} ya está enlazado`);
		}
		return this.repo.insertLink(
			projectId,
			repoFullName,
			this.now().toISOString(),
		);
	}

	async unlink(linkId: number): Promise<void> {
		const removed = await this.repo.removeLink(linkId);
		if (!removed) {
			throw new NotFoundError(`enlace ${linkId} no existe`);
		}
	}

	async activity(projectId: number): Promise<RepoActivity[]> {
		const links = await this.listLinks(projectId);
		return Promise.all(
			links.map(async (link) => {
				const repo = link.repo_full_name;
				const [branches, commits, issues, pulls] = await Promise.all([
					this.client.branches(repo),
					this.client.commits(repo, 15),
					this.client.issues(repo),
					this.client.pulls(repo),
				]);
				return { repo_full_name: repo, branches, commits, issues, pulls };
			}),
		);
	}

	listItemCommits(itemId: number) {
		return this.repo.listCommitsByItem(itemId);
	}

	/**
	 * Polling de smart commits sobre TODOS los repos enlazados. Idempotente:
	 * el UNIQUE(item_id, sha) hace que reescanear no duplique ni re-cierre.
	 */
	async scanSmartCommits(): Promise<{ linked: number; closed: number }> {
		const links = await this.repo.listAllLinks();
		let linked = 0;
		let closed = 0;

		for (const link of links) {
			let commits: Awaited<ReturnType<GitHubClient["commits"]>>;
			try {
				commits = await this.client.commits(link.repo_full_name);
			} catch (error) {
				// Un repo caído no debe tumbar el resto del escaneo.
				this.log(
					`github: fallo escaneando ${link.repo_full_name} (${error instanceof Error ? error.message : "error"})`,
				);
				continue;
			}

			for (const commit of commits) {
				const closing = new Set(
					[...commit.message.matchAll(CLOSE_PATTERN)].map((match) =>
						(match[1] as string).toUpperCase(),
					),
				);
				for (const match of commit.message.matchAll(KEY_PATTERN)) {
					const prefix = match[1] as string;
					const keyNumber = Number(match[2]);
					const item = await this.repo.findItemByKey(prefix, keyNumber);
					if (!item) continue;

					const isNew = await this.repo.insertItemCommit({
						item_id: item.id,
						sha: commit.sha,
						message: commit.message.split("\n")[0] ?? commit.message,
						url: commit.url,
						committed_at: commit.committed_at,
					});
					if (!isNew) continue;
					linked++;

					const key = `${prefix}-${keyNumber}`;
					if (closing.has(key) && item.status !== "done") {
						await this.itemsService.update(item.id, { status: "done" });
						closed++;
						this.log(`github: ${commit.sha.slice(0, 7)} cierra ${key}`);
					}
				}
			}
		}
		return { linked, closed };
	}

	private async assertProject(projectId: number): Promise<void> {
		const project = await this.projectsRepo.getById(projectId);
		if (!project) {
			throw new NotFoundError(`proyecto ${projectId} no existe`);
		}
	}
}
