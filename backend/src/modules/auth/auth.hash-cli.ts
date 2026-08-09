import { randomBytes } from "node:crypto";
import { hashPassword } from "./auth.password.js";

/**
 * `pnpm --filter backend auth:hash` — genera el bloque AUTH_* del `.env`.
 *
 * La contraseña se lee por stdin, nunca por argumento (acabaría en el historial
 * del shell), y en una terminal interactiva no se hace eco: tampoco queda en el
 * scrollback. Se acepta también por tubería para poder automatizarlo:
 *   printf 'clave\nclave\n' | pnpm --filter backend auth:hash
 */

const CTRL_C = "";
const CTRL_D = "";
const BACKSPACE = new Set(["", "\b"]);

/** Lee una línea sin eco en TTY. */
function askMasked(question: string): Promise<string> {
	process.stdout.write(question);
	const input = process.stdin;
	input.setRawMode(true);
	input.resume();
	input.setEncoding("utf8");

	return new Promise((resolve) => {
		let value = "";
		const finish = () => {
			input.setRawMode(false);
			input.pause();
			input.off("data", onData);
			process.stdout.write("\n");
			resolve(value);
		};
		const onData = (chunk: string) => {
			for (const char of chunk) {
				if (char === "\n" || char === "\r" || char === CTRL_D) {
					finish();
					return;
				}
				if (char === CTRL_C) {
					input.setRawMode(false);
					process.stdout.write("\n");
					process.exit(130);
				}
				if (BACKSPACE.has(char)) {
					value = value.slice(0, -1);
					continue;
				}
				value += char;
			}
		};
		input.on("data", onData);
	});
}

/** Sin TTY (tubería): se consume todo stdin y se parten las líneas. */
async function readPipedLines(): Promise<string[]> {
	let buffer = "";
	process.stdin.setEncoding("utf8");
	for await (const chunk of process.stdin) {
		buffer += chunk;
	}
	return buffer.split("\n");
}

let password: string;
let repeat: string;
if (process.stdin.isTTY) {
	password = await askMasked("Contraseña para Ganttero: ");
	repeat = await askMasked("Repítela: ");
} else {
	const [first = "", second = ""] = await readPipedLines();
	password = first;
	repeat = second;
}

if (password.length === 0) {
	console.error("La contraseña no puede estar vacía.");
	process.exit(1);
}
if (password !== repeat) {
	console.error("Las contraseñas no coinciden.");
	process.exit(1);
}
if (password.length < 12) {
	console.warn("Aviso: menos de 12 caracteres. Usa una contraseña más larga.");
}

const hash = await hashPassword(password);
const secret = randomBytes(32).toString("hex");

console.log("\nAñade esto al .env (AUTH_SECRET solo si aún no tienes uno):\n");
console.log(`AUTH_PASSWORD_HASH=${hash}`);
console.log(`AUTH_SECRET=${secret}`);
console.log("\nRecuerda AUTH_USERNAME y reiniciar el backend.");
process.exit(0);
