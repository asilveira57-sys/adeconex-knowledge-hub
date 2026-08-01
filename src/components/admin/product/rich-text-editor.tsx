import { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  ImagePlus,
  Table2,
  Quote,
  Code2,
  Undo2,
  Redo2,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
};

/** Editor rico com alternância Visual ↔ HTML, para o conteúdo do produto. */
export function RichTextEditor({ value, onChange, minHeight = 260 }: Props) {
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [raw, setRaw] = useState(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    immediatelyRender: false,
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none prose-table:text-xs prose-p:my-2 prose-ul:my-2",
        style: `min-height:${minHeight}px`,
      },
    },
  });

  useEffect(() => {
    setRaw(value);
  }, [value]);

  function switchTo(next: "visual" | "html") {
    if (next === "html") {
      setRaw(editor?.getHTML() ?? value);
    } else if (editor) {
      editor.commands.setContent(raw || "", { emitUpdate: false });
      onChange(raw);
    }
    setMode(next);
  }

  const Btn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${
        active ? "bg-accent text-accent-foreground" : ""
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="rounded-md border bg-surface-1">
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        {mode === "visual" && editor && (
          <>
            <Btn title="Negrito" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold className="h-4 w-4" />
            </Btn>
            <Btn title="Itálico" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic className="h-4 w-4" />
            </Btn>
            <Btn title="Título H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 className="h-4 w-4" />
            </Btn>
            <Btn title="Título H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
              <Heading3 className="h-4 w-4" />
            </Btn>
            <Btn title="Lista" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List className="h-4 w-4" />
            </Btn>
            <Btn title="Lista numerada" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered className="h-4 w-4" />
            </Btn>
            <Btn title="Citação" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote className="h-4 w-4" />
            </Btn>
            <Btn
              title="Link"
              active={editor.isActive("link")}
              onClick={() => {
                const url = window.prompt("URL do link", editor.getAttributes("link").href ?? "https://");
                if (url === null) return;
                if (url === "") editor.chain().focus().unsetLink().run();
                else editor.chain().focus().setLink({ href: url }).run();
              }}
            >
              <Link2 className="h-4 w-4" />
            </Btn>
            <Btn
              title="Imagem"
              onClick={() => {
                const url = window.prompt("URL da imagem", "https://");
                if (url) editor.chain().focus().setImage({ src: url }).run();
              }}
            >
              <ImagePlus className="h-4 w-4" />
            </Btn>
            <Btn
              title="Tabela 3x3"
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <Table2 className="h-4 w-4" />
            </Btn>
            <Btn title="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
              <Undo2 className="h-4 w-4" />
            </Btn>
            <Btn title="Refazer" onClick={() => editor.chain().focus().redo().run()}>
              <Redo2 className="h-4 w-4" />
            </Btn>
          </>
        )}
        <div className="ml-auto">
          <Button
            type="button"
            size="sm"
            variant={mode === "html" ? "default" : "ghost"}
            onClick={() => switchTo(mode === "html" ? "visual" : "html")}
          >
            <Code2 className="mr-1 h-3.5 w-3.5" />
            {mode === "html" ? "Voltar ao visual" : "Editar HTML"}
          </Button>
        </div>
      </div>

      {mode === "visual" ? (
        <div className="p-3">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <textarea
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            onChange(e.target.value);
          }}
          spellCheck={false}
          className="w-full resize-y bg-transparent p-3 font-mono text-xs outline-none"
          style={{ minHeight }}
        />
      )}
    </div>
  );
}
