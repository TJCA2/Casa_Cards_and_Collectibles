import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ── Categories ────────────────────────────────────────────────────────────

  const baseball = await prisma.category.upsert({
    where: { slug: "baseball-cards" },
    update: {},
    create: {
      name: "Baseball Cards",
      slug: "baseball-cards",
      description: "MLB and minor league baseball trading cards",
    },
  });

  const basketball = await prisma.category.upsert({
    where: { slug: "basketball-cards" },
    update: {},
    create: {
      name: "Basketball Cards",
      slug: "basketball-cards",
      description: "NBA and basketball trading cards",
    },
  });

  const football = await prisma.category.upsert({
    where: { slug: "football-cards" },
    update: {},
    create: {
      name: "Football Cards",
      slug: "football-cards",
      description: "NFL and football trading cards",
    },
  });

  // ── Sample products ───────────────────────────────────────────────────────

  const products = [
    {
      title: "2023 Topps Chrome Mike Trout PSA 10",
      slug: "2023-topps-chrome-mike-trout-psa-10",
      description: "Mike Trout 2023 Topps Chrome base card, graded PSA 10 Gem Mint.",
      price: "149.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 1,
      sku: "SAMPLE-001",
      categoryId: baseball.id,
    },
    {
      title: "2021 Panini Prizm Patrick Mahomes Silver",
      slug: "2021-panini-prizm-patrick-mahomes-silver",
      description: "Patrick Mahomes 2021 Panini Prizm Silver Prizm parallel, near mint.",
      price: "89.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 2,
      sku: "SAMPLE-002",
      categoryId: football.id,
    },
    {
      title: "1986 Fleer Michael Jordan Rookie Card",
      slug: "1986-fleer-michael-jordan-rookie-card",
      description: "Michael Jordan 1986 Fleer rookie card. Light play, great color.",
      price: "1299.99",
      compareAtPrice: "1499.99",
      condition: "USED" as const,
      stockQuantity: 1,
      sku: "SAMPLE-003",
      categoryId: basketball.id,
    },
    {
      title: "2020 Topps Series 1 Fernando Tatis Jr.",
      slug: "2020-topps-series-1-fernando-tatis-jr",
      description: "Fernando Tatis Jr. 2020 Topps Series 1 base card, ungraded raw.",
      price: "12.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 5,
      sku: "SAMPLE-004",
      categoryId: baseball.id,
    },
    {
      title: "1979 O-Pee-Chee Wayne Gretzky Rookie",
      slug: "1979-o-pee-chee-wayne-gretzky-rookie",
      description: "Wayne Gretzky 1979 O-Pee-Chee rookie card. Good condition, minor corner wear.",
      price: "2499.99",
      condition: "USED" as const,
      stockQuantity: 1,
      sku: "SAMPLE-005",
      categoryId: null,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: { categoryId: p.categoryId, slug: p.slug },
      create: {
        ...p,
        price: p.price,
        compareAtPrice: ("compareAtPrice" in p ? p.compareAtPrice : null) ?? null,
        isActive: true,
      },
    });
  }

  console.warn("✓ Seeded 3 categories and 5 products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
