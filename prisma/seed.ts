import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create a sample category
  const category = await prisma.category.upsert({
    where: { slug: "trading-cards" },
    update: {},
    create: {
      name: "Trading Cards",
      slug: "trading-cards",
      description: "Sports and collectible trading cards",
    },
  });

  // Seed 5 sample products
  const products = [
    {
      title: "2023 Topps Chrome Mike Trout PSA 10",
      description: "Mike Trout 2023 Topps Chrome base card, graded PSA 10 Gem Mint.",
      price: "149.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 1,
      sku: "SAMPLE-001",
    },
    {
      title: "2021 Panini Prizm Patrick Mahomes Silver",
      description: "Patrick Mahomes 2021 Panini Prizm Silver Prizm parallel, near mint.",
      price: "89.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 2,
      sku: "SAMPLE-002",
    },
    {
      title: "1986 Fleer Michael Jordan Rookie Card",
      description: "Michael Jordan 1986 Fleer rookie card. Light play, great color.",
      price: "1299.99",
      compareAtPrice: "1499.99",
      condition: "USED" as const,
      stockQuantity: 1,
      sku: "SAMPLE-003",
    },
    {
      title: "2020 Topps Series 1 Fernando Tatis Jr.",
      description: "Fernando Tatis Jr. 2020 Topps Series 1 base card, ungraded raw.",
      price: "12.99",
      condition: "LIKE_NEW" as const,
      stockQuantity: 5,
      sku: "SAMPLE-004",
    },
    {
      title: "1979 O-Pee-Chee Wayne Gretzky Rookie",
      description: "Wayne Gretzky 1979 O-Pee-Chee rookie card. Good condition, minor corner wear.",
      price: "2499.99",
      condition: "USED" as const,
      stockQuantity: 1,
      sku: "SAMPLE-005",
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        ...p,
        price: p.price,
        compareAtPrice: p.compareAtPrice ?? null,
        categoryId: category.id,
        isActive: true,
      },
    });
  }

  console.log("✓ Seeded 1 category and 5 products");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
