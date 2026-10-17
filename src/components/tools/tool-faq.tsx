import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    }),
  };
}

export function ToolFaq({ items, title = "Perguntas frequentes" }: { items: FaqItem[]; title?: string }) {
  return (
    <section className="container-page pb-14">
      <h2 className="font-display text-xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <Accordion type="single" collapsible className="mt-2 max-w-3xl md:mt-4">
        {items.map((i, idx) => (
          <AccordionItem key={idx} value={`faq-${idx}`}>
            <AccordionTrigger className="items-start gap-3 py-5 text-base font-medium leading-snug [&>svg]:mt-1 [&>svg]:shrink-0 hover:no-underline md:py-4 md:text-sm md:leading-normal">
              {i.q}
            </AccordionTrigger>
            <AccordionContent className="pb-5 pr-2 text-[15px] leading-relaxed text-muted-foreground md:pb-4 md:pr-4 md:text-sm">
              {i.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
