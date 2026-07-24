/**
 * Cliente mínimo de la API de GitHub (el ÚNICO punto en la nube).
 * El token llega inyectado desde env y JAMÁS se loggea ni se persiste.
 * Decisión de la Fase 6: POLLING — nada de la LAN se expone a Internet.
 */

export interface GitHubBranch {
	name: string;
}
export interface GitHubCommit {
	sha: string;
	message: string;
	url: string;
	committed_at: string;
}
export interface GitHubIssue {
	number: number;
	title: string;
	url: string;
	state: string;
}

export interface GitHubClient {
	branches(repo: string): Promise<GitHubBranch[]>;
	commits(repo: string, perPage?: number): Promise<GitHubCommit[]>;
	issues(repo: string): Promise<GitHubIssue[]>;
	pulls(repo: string): Promise<GitHubIssue[]>;
}

export class GitHubApiError extends Error {
	constructor(
		readonly status: number,
		repo: string,
	) {
		// Solo status y repo: nunca el cuerpo (podría reflejar el token).
		super(`GitHub respondió ${status} para ${repo}`);
		this.name = "GitHubApiError";
	}
}

export class RealGitHubClient implements GitHubClient {
	constructor(
		private readonly token: string | undefined,
		private readonly fetchFn: typeof fetch = fetch,
	) {}

	private async get<T>(path: string, repo: string): Promise<T> {
		const response = await this.fetchFn(`https://api.github.com${path}`, {
			headers: {
				accept: "application/vnd.github+json",
				"x-github-api-version": "2022-11-28",
				...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
			},
		});
		if (!response.ok) {
			throw new GitHubApiError(response.status, repo);
		}
		return (await response.json()) as T;
	}

	async branches(repo: string): Promise<GitHubBranch[]> {
		const rows = await this.get<Array<{ name: string }>>(
			`/repos/${repo}/branches?per_page=20`,
			repo,
		);
		return rows.map((row) => ({ name: row.name }));
	}

	async commits(repo: string, perPage = 30): Promise<GitHubCommit[]> {
		const rows = await this.get<
			Array<{
				sha: string;
				html_url: string;
				commit: { message: string; committer: { date: string } | null };
			}>
		>(`/repos/${repo}/commits?per_page=${perPage}`, repo);
		return rows.map((row) => ({
			sha: row.sha,
			message: row.commit.message,
			url: row.html_url,
			committed_at: row.commit.committer?.date ?? "",
		}));
	}

	async issues(repo: string): Promise<GitHubIssue[]> {
		const rows = await this.get<
			Array<{
				number: number;
				title: string;
				html_url: string;
				state: string;
				pull_request?: unknown;
			}>
		>(`/repos/${repo}/issues?state=open&per_page=20`, repo);
		return rows
			.filter((row) => !row.pull_request)
			.map((row) => ({
				number: row.number,
				title: row.title,
				url: row.html_url,
				state: row.state,
			}));
	}

	async pulls(repo: string): Promise<GitHubIssue[]> {
		const rows = await this.get<
			Array<{ number: number; title: string; html_url: string; state: string }>
		>(`/repos/${repo}/pulls?state=open&per_page=20`, repo);
		return rows.map((row) => ({
			number: row.number,
			title: row.title,
			url: row.html_url,
			state: row.state,
		}));
	}
}
