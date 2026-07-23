import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react()],
	server: {
		proxy: {
			// El backend Fastify sirve la API; mismo origen en dev sin CORS.
			"/api": "http://localhost:3000",
		},
	},
});
