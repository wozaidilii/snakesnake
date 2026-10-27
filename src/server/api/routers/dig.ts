import { z } from "zod";

import { emptySave, normalizeSave } from "~/game/save";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const saveInput = z.object({
  cleared: z.array(z.string().max(40)).max(250),
  hats: z.array(z.string().max(40)).max(250),
  jigsaws: z.array(z.string().max(40)).max(12),
  best: z
    .array(z.object({ id: z.string().max(40), moves: z.number().int().min(0).max(999) }))
    .max(250),
});

const SOLO = "solo";

export const digRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.digSave.findUnique({ where: { id: SOLO } });
    if (!row) return emptySave;
    return normalizeSave(row.data);
  }),

  sync: publicProcedure.input(saveInput).mutation(async ({ ctx, input }) => {
    await ctx.db.digSave.upsert({
      where: { id: SOLO },
      create: { id: SOLO, data: input },
      update: { data: input },
    });
    return input;
  }),
});
