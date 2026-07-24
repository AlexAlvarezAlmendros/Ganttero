import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import multipart from "@fastify/multipart";
import type { FastifyInstance } from "fastify";
import { DomainError } from "../../lib/errors.js";
import type { SettingsRepo } from "../settings/settings.repo.js";
import type { VoiceService } from "./voice.service.js";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function voiceRoutes(
	service: VoiceService,
	settingsRepo: SettingsRepo,
	audioDir: string,
) {
	return async function routes(app: FastifyInstance): Promise<void> {
		await app.register(multipart, {
			limits: { fileSize: MAX_AUDIO_BYTES, files: 1 },
		});

		app.post("/voice", async (request) => {
			const upload = await request.file();
			if (!upload) {
				throw new DomainError("falta el fichero de audio");
			}

			const retain = (await settingsRepo.get()).retain_audio;
			const extension = upload.filename?.split(".").pop() ?? "webm";
			const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
			const directory = retain ? audioDir : tmpdir();
			await mkdir(directory, { recursive: true });
			const path = join(directory, name);
			await pipeline(upload.file, createWriteStream(path));

			try {
				return await service.capture(path, retain ? path : null);
			} finally {
				if (!retain) {
					await rm(path, { force: true });
				}
			}
		});
	};
}
