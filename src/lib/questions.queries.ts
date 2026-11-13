/** Carregamento de perguntas para loaders de rota, sem importar o componente (e o cliente Supabase). */
import { getPublishedQuestions } from "@/lib/questions.functions";

export type QuestionTarget = { type: "product"; id: string } | { type: "download"; id: string } | { type: "tool"; path: string };

export const loadQuestions = (t: QuestionTarget) => getPublishedQuestions({ data: { target: t, page: 0 } }).catch(() => null);
