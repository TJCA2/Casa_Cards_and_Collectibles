/**
 * One-time backfill: parse grades from card titles for all products that
 * currently have grade = null.
 *
 * Run with:
 *   npx tsx scripts/backfill-grades.ts
 */

import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(__dirname, "../.env.local") });

import { PrismaClient } from "@prisma/client";
import { extractGradeFromTitle } from "../src/lib/ebay/sync";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { grade: null },
    select: { id: true, title: true },
  });

  console.warn(`Found ${products.length} products with no grade.`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const grade = extractGradeFromTitle(product.title);
    if (grade) {
      await prisma.product.update({ where: { id: product.id }, data: { grade } });
      console.warn(`  ✓ "${product.title.slice(0, 60)}" → ${grade}`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.warn(`\nDone. Updated: ${updated}, No grade found: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
