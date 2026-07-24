import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useReducer, useRef, useState } from "react";
import { Markdown } from "tiptap-markdown";
import "./ds.css";

/** `tiptap-markdown` no augmenta el tipo `Storage`; accedemos con tipo local. */
function getMarkdown(editor: Editor): string {
	return (
		editor.storage as unknown as { markdown: { getMarkdown: () => string } }
	).markdown.getMarkdown();
}

/**
 * Editor WYSIWYG cuya fuente de verdad es **markdown**: el usuario ve texto
 * con formato, pero `value`/`onChange` viajan como markdown (lo que se
 * persiste en `item.description`). Formato básico: negrita, cursiva, títulos,
 * listas, checklists, enlaces y código.
 *
 * Botón opcional "Mejorar formato" (`improve`): manda el markdown actual a la
 * IA local y reemplaza el contenido con la versión mejorada. Si la IA falla,
 * conserva lo escrito y muestra el error inline (nunca bloquea).
 */
export interface MarkdownEditorProps {
	label?: string;
	value: string;
	onChange: (markdown: string) => void;
	placeholder?: string;
	disabled?: boolean;
	improve?: {
		/** Devuelve el markdown mejorado; lanza si la IA falla. */
		run: (current: string) => Promise<string>;
		label?: string;
	};
}

export function MarkdownEditor({
	label,
	value,
	onChange,
	placeholder,
	disabled = false,
	improve,
}: MarkdownEditorProps) {
	// Refrescamos la toolbar en cada transacción (marca activa, selección).
	const [, force] = useReducer((n: number) => n + 1, 0);
	// Último markdown que EMITIMOS: distingue cambios internos (typing) de
	// externos (improve / abrir otra tarea) y evita saltos de cursor.
	const lastEmitted = useRef(value);
	const [improving, setImproving] = useState(false);
	const [improveError, setImproveError] = useState<string | null>(null);

	const editor = useEditor({
		editable: !disabled,
		extensions: [
			StarterKit,
			TaskList,
			TaskItem.configure({ nested: true }),
			Markdown.configure({ html: false, transformPastedText: true }),
		],
		content: value,
		onUpdate: ({ editor: instance }) => {
			const markdown = getMarkdown(instance);
			lastEmitted.current = markdown;
			onChange(markdown);
		},
	});

	// Re-render en cada transacción para reflejar el estado de la toolbar.
	useEffect(() => {
		if (!editor) return;
		const handler = () => force();
		editor.on("transaction", handler);
		return () => {
			editor.off("transaction", handler);
		};
	}, [editor]);

	// Sincroniza cambios externos de `value` (improve, otra tarea) sin pisar
	// lo que el usuario está tecleando.
	useEffect(() => {
		if (!editor) return;
		if (value !== lastEmitted.current) {
			lastEmitted.current = value;
			editor.commands.setContent(value, { emitUpdate: false });
		}
	}, [editor, value]);

	useEffect(() => {
		editor?.setEditable(!disabled);
	}, [editor, disabled]);

	async function handleImprove() {
		if (!editor || !improve) return;
		const current = getMarkdown(editor);
		if (!current.trim()) return;
		setImproving(true);
		setImproveError(null);
		try {
			const improved = await improve.run(current);
			lastEmitted.current = improved;
			editor.commands.setContent(improved, { emitUpdate: false });
			onChange(improved);
		} catch (error) {
			// Fallback: no tocamos el texto; solo avisamos.
			setImproveError(
				error instanceof Error
					? error.message
					: "la IA no pudo mejorar el texto",
			);
		} finally {
			setImproving(false);
		}
	}

	const busy = disabled || improving;
	const isEmpty = editor?.isEmpty ?? true;

	return (
		<div className="gtr-field">
			{label && <span className="gtr-field__label">{label}</span>}
			<div className={`gtr-md${busy ? " gtr-md--busy" : ""}`}>
				<div className="gtr-md__bar">
					<div className="gtr-md__tools">
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("bold")}
							title="Negrita"
							onClick={() => editor?.chain().focus().toggleBold().run()}
						>
							B
						</ToolButton>
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("italic")}
							title="Cursiva"
							onClick={() => editor?.chain().focus().toggleItalic().run()}
						>
							<span style={{ fontStyle: "italic" }}>I</span>
						</ToolButton>
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("heading", { level: 2 })}
							title="Título"
							onClick={() =>
								editor?.chain().focus().toggleHeading({ level: 2 }).run()
							}
						>
							H
						</ToolButton>
						<span className="gtr-md__sep" />
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("bulletList")}
							title="Lista"
							onClick={() => editor?.chain().focus().toggleBulletList().run()}
						>
							•
						</ToolButton>
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("orderedList")}
							title="Lista numerada"
							onClick={() => editor?.chain().focus().toggleOrderedList().run()}
						>
							1.
						</ToolButton>
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("taskList")}
							title="Checklist"
							onClick={() => editor?.chain().focus().toggleTaskList().run()}
						>
							☑
						</ToolButton>
						<span className="gtr-md__sep" />
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("code")}
							title="Código"
							onClick={() => editor?.chain().focus().toggleCode().run()}
						>
							{"</>"}
						</ToolButton>
						<ToolButton
							editor={editor}
							disabled={busy}
							active={editor?.isActive("link")}
							title="Enlace"
							onClick={() => toggleLink(editor)}
						>
							🔗
						</ToolButton>
					</div>
					{improve && (
						<button
							type="button"
							className="gtr-md__improve"
							disabled={busy || isEmpty}
							onClick={handleImprove}
							title="Reestructura y enriquece con la IA local"
						>
							{improving
								? "MEJORANDO…"
								: (improve.label ?? "✨ MEJORAR FORMATO")}
						</button>
					)}
				</div>
				<EditorContent editor={editor} className="gtr-md__content" />
				{isEmpty && placeholder && (
					<span className="gtr-md__placeholder">{`// ${placeholder}`}</span>
				)}
			</div>
			{improveError && (
				<span className="gtr-field__hint gtr-md__error">
					⚠ la IA no pudo mejorar el formato ({improveError}); tu texto sigue
					intacto
				</span>
			)}
		</div>
	);
}

function ToolButton({
	editor,
	active,
	disabled,
	title,
	onClick,
	children,
}: {
	editor: ReturnType<typeof useEditor>;
	active?: boolean;
	disabled?: boolean;
	title: string;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			className={`gtr-md__tool${active ? " is-active" : ""}`}
			disabled={disabled || !editor}
			title={title}
			// Evita robar el foco/selección al editor antes de ejecutar el comando.
			onMouseDown={(event) => event.preventDefault()}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

/** Alterna un enlace en la selección: pide URL o lo quita si ya existe. */
function toggleLink(editor: ReturnType<typeof useEditor>): void {
	if (!editor) return;
	if (editor.isActive("link")) {
		editor.chain().focus().unsetLink().run();
		return;
	}
	const url = window.prompt("URL del enlace:")?.trim();
	if (!url) return;
	editor.chain().focus().setLink({ href: url }).run();
}
