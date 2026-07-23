// Sample project data — Ganttero planning itself (dates around "today" = 23 JUL 2026)
const GT_DATA = {
	project: "GANTTERO",
	window: 14,
	epics: [
		{
			id: "GP-1",
			title: "Fase 0 — Spike de voz",
			start: "2026-07-06",
			end: "2026-07-24",
			tasks: [
				{
					id: "GP-38",
					title: "Spike de voz — audio → JSON",
					status: "done",
					start: "2026-07-06",
					end: "2026-07-18",
					est: "8h",
					logged: "6h 40m",
				},
				{
					id: "GP-39",
					title: "Medir latencia Whisper + Gemma",
					status: "in_progress",
					start: "2026-07-20",
					end: "2026-07-24",
					est: "3h",
					logged: "1h 05m",
				},
			],
		},
		{
			id: "GP-2",
			title: "Fase 1 — Fundaciones",
			start: "2026-07-21",
			end: "2026-08-14",
			tasks: [
				{
					id: "GP-42",
					title: "Migrar sqld al NAS",
					status: "backlog",
					start: "2026-07-23",
					end: "2026-07-25",
					est: "4h",
				},
				{
					id: "GP-31",
					title: "Webhook GitHub: verificar firma",
					status: "backlog",
					start: "2026-07-18",
					end: "2026-07-21",
					est: "2h",
				},
				{
					id: "GP-44",
					title: "CRUD de items (épica/tarea/subtarea)",
					status: "backlog",
					start: "2026-07-27",
					end: "2026-08-05",
					est: "12h",
				},
				{
					id: "GP-45",
					title: "Migraciones libSQL up/down",
					status: "blocked",
					start: "2026-07-28",
					end: "2026-08-02",
					est: "5h",
				},
			],
		},
		{
			id: "GP-3",
			title: "Fase 2 — Kanban + cronometraje",
			start: "2026-08-10",
			end: "2026-09-04",
			tasks: [
				{
					id: "GP-51",
					title: "Tablero: columnas por estado",
					status: "backlog",
					start: "2026-08-10",
					end: "2026-08-18",
					est: "10h",
				},
				{
					id: "GP-52",
					title: "time_log automático en curso",
					status: "backlog",
					start: "2026-08-19",
					end: "2026-08-26",
					est: "6h",
				},
			],
		},
	],
	commits: [
		{
			sha: "a1b2c3f",
			msg: "GP-38 spike: pipeline audio→JSON estable",
			when: "hace 2 días",
		},
		{
			sha: "9d8e7f0",
			msg: "GP-39 bench: faster-whisper small, 1.8s/10s audio",
			when: "hace 4 h",
		},
	],
};
const GT_TODAY = new Date("2026-07-23");
function gtPriority(t) {
	if (t.status === "done") return "done";
	if (t.status === "blocked") return "blocked";
	const end = new Date(t.end),
		start = new Date(t.start);
	if (end < GT_TODAY) return "late";
	if ((start - GT_TODAY) / 86400000 <= 1.5) return "now";
	return "normal";
}
function gtDates(t) {
	const f = (d) => {
		const x = new Date(d);
		return (
			x.getDate() +
			" " +
			[
				"ENE",
				"FEB",
				"MAR",
				"ABR",
				"MAY",
				"JUN",
				"JUL",
				"AGO",
				"SEP",
				"OCT",
				"NOV",
				"DIC",
			][x.getMonth()]
		);
	};
	return f(t.start) + " → " + f(t.end);
}
function gtAllTasks(data) {
	return data.epics.flatMap((e) =>
		e.tasks.map((t) => ({ ...t, epic: e.title, epicId: e.id })),
	);
}
const GT_PROJECTS = [
	{
		id: "p1",
		name: "GANTTERO",
		desc: "Kanban + Gantt multi-escala self-hosted",
		repo: "AlexAlvarezAlmendros/Ganttero",
		window: 14,
		epics: GT_DATA.epics,
		commits: GT_DATA.commits,
	},
	{
		id: "p2",
		name: "HOMELAB",
		desc: "Infraestructura del homeserver y NAS",
		repo: "",
		window: 7,
		commits: [],
		epics: [
			{
				id: "HL-1",
				title: "Backups y monitorización",
				start: "2026-07-20",
				end: "2026-08-08",
				tasks: [
					{
						id: "HL-12",
						title: "Cron de backup del fichero libSQL",
						status: "in_progress",
						start: "2026-07-21",
						end: "2026-07-24",
						est: "2h",
						logged: "0h 40m",
					},
					{
						id: "HL-14",
						title: "Alertas de salud de STT/Gemma/sqld",
						status: "backlog",
						start: "2026-07-27",
						end: "2026-07-31",
						est: "4h",
					},
				],
			},
		],
	},
];
Object.assign(window, {
	GT_DATA,
	GT_PROJECTS,
	GT_TODAY,
	gtPriority,
	gtDates,
	gtAllTasks,
});
