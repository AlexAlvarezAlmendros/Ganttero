import { z } from "zod";

export const githubLinkSchema = z.object({
	id: z.number().int(),
	project_id: z.number().int(),
	repo_full_name: z.string(),
	created_at: z.string(),
});
export type GithubLink = z.infer<typeof githubLinkSchema>;

export const createLinkSchema = z.object({
	repo_full_name: z
		.string()
		.trim()
		.regex(/^[\w.-]+\/[\w.-]+$/, "formato owner/repo"),
});

export const itemCommitSchema = z.object({
	id: z.number().int(),
	item_id: z.number().int(),
	sha: z.string(),
	message: z.string(),
	url: z.string(),
	committed_at: z.string(),
});
export type ItemCommit = z.infer<typeof itemCommitSchema>;

export interface RepoActivity {
	repo_full_name: string;
	branches: Array<{ name: string }>;
	commits: Array<{
		sha: string;
		message: string;
		url: string;
		committed_at: string;
	}>;
	issues: Array<{ number: number; title: string; url: string; state: string }>;
	pulls: Array<{ number: number; title: string; url: string; state: string }>;
}

export interface GithubStatus {
	token_configured: boolean;
	poll_seconds: number;
}
