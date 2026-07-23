import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { routeTaskToAi } from "./leah-catalog";

const PlannerInput = z.object({ request: z.string().min(3) });

const PlanSchema = z.object({
  summary: z.string(),
  tasks: z.array(z.object({
    kind: z.string(),
    title: z.string(),
    description: z.string(),
  })),
});

function fallbackPlan(request: string) {
  const kinds = ["backend", "frontend", "database", "auth", "api", "payments", "testing", "deployment", "documentation", "security"];
  return {
    summary: `Plan i gjeneruar për: ${request}`,
    tasks: kinds.map((k) => ({
      kind: k,
      title: `${k.charAt(0).toUpperCase() + k.slice(1)} module`,
      description: `Përgatit modulin e ${k} për projektin.`,
    })),
  };
}

export const planRequest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlannerInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      const plan = fallbackPlan(data.request);
      return { ...plan, mock: true, tasks: plan.tasks.map((t) => ({ ...t, assignedAi: routeTaskToAi(t.kind).id })) };
    }
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.6-flash");

    try {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: PlanSchema }),
        prompt: `Ti je Leah, orkestruesja e një AI Operating System. Zbërthe këtë kërkesë të përdoruesit në 6-10 nën-detyra teknike konkrete, secila me një nga këto kinds: backend, frontend, database, auth, api, payments, testing, deployment, documentation, security.\n\nKërkesa: "${data.request}"\n\nKthe një JSON me summary (1-2 fjali në shqip) dhe tasks (array). Çdo task duhet të ketë kind, title (i shkurtër), description (1 fjali).`,
      });
      return {
        ...output,
        mock: false,
        tasks: output.tasks.map((t) => ({ ...t, assignedAi: routeTaskToAi(t.kind).id })),
      };
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        const plan = fallbackPlan(data.request);
        return { ...plan, mock: true, tasks: plan.tasks.map((t) => ({ ...t, assignedAi: routeTaskToAi(t.kind).id })) };
      }
      const plan = fallbackPlan(data.request);
      return { ...plan, mock: true, error: String((err as Error).message ?? err), tasks: plan.tasks.map((t) => ({ ...t, assignedAi: routeTaskToAi(t.kind).id })) };
    }
  });