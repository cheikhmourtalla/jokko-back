import { prisma } from "../config/prisma.js";
import { FeatureCode, PlanType } from "../database/prisma/generated/prisma/enums.js";

export const seedDb = async () => {
  try {
    // ==================================================
    // Plans
    // ==================================================

    const plans = [
      {
        code: "FREE",
        name: "Free",
        price: 0,
        maxUsers: 1,
        maxProducts: 50,
        maxCustomers: null,
        maxSalesPerMonth: 100,
        maxStores: null,
      },
      {
        code: "BASIC",
        name: "Basic",
        price: 6500,
        maxUsers: 3,
        maxProducts: 600,
        maxCustomers: null,
        maxSalesPerMonth: null,
        maxStores: null,
      },
      {
        code: "PRO",
        name: "Pro",
        price: 14000,
        maxUsers: 5,
        maxProducts: null,
        maxCustomers: null,
        maxSalesPerMonth: null,
        maxStores: 2,
      },
      {
        code: "PREMIUM",
        name: "Premium",
        price: 22000,
        maxUsers: null,
        maxProducts: null,
        maxCustomers: null,
        maxSalesPerMonth: null,
        maxStores: 5,
      },
    ];

    for (const plan of plans) {
      const planWithTypedCode= { ...plan , code: plan.code as PlanType }


      await prisma.plan.upsert({
        where: {
          code: plan.code as PlanType,
        },
        create: planWithTypedCode,
        update: planWithTypedCode,
      });
    }

    // Remove deleted plans
    // await prisma.plan.deleteMany({
    //   where: {
    //     code: {
    //       notIn: plans.map((p) => p.code),
    //     },
    //   },
    // });

    // ==================================================
    // Features
    // ==================================================

    const features = [
      { code: "EXPORT_PDF", name: "Export PDF" },
      { code: "EXPORT_EXCEL", name: "Export Excel" },
      { code: "LOW_STOCK_ALERT", name: "Low Stock Alert" },
      { code: "OUT_OF_STOCK_ALERT", name: "Out of Stock Alert" },
      { code: "TOP_PRODUCTS", name: "Top Products" },
      { code: "STOCK_VALUE", name: "Stock Value" },
      { code: "SUPPLIER_MANAGEMENT", name: "Supplier Management" },
      { code: "ADVANCED_REPORTS", name: "Advanced Reports" },
      { code: "ACCOUNTING", name: "Accounting" },
      { code: "MULTI_STORE", name: "Multi Store" },
      { code: "API_ACCESS", name: "API Access" },
    ];

    for (const feature of features) {
      const featureWithTypedCode= { ...feature , code: feature.code as FeatureCode }


      await prisma.feature.upsert({
        where: {
          code: feature.code as  FeatureCode,
        },
        create: featureWithTypedCode,
        update: featureWithTypedCode,
      });
    }

    // Remove deleted features
    // await prisma.feature.deleteMany({
    //   where: {
    //     code: {
    //       notIn: features.map((f) => f.code),
    //     },
    //   },
    // });

    // ==================================================
    // Load ids
    // ==================================================

    const dbPlans = await prisma.plan.findMany();
    const dbFeatures = await prisma.feature.findMany();

    const planMap = Object.fromEntries(
      dbPlans.map((p) => [p.code, p.id])
    );

    const featureMap = Object.fromEntries(
      dbFeatures.map((f) => [f.code, f.id])
    );

    // ==================================================
    // Plan Feature Mapping
    // ==================================================

    const mappings: Record<string, string[]> = {
      FREE: [],

      BASIC: [
        "EXPORT_PDF",
        "EXPORT_EXCEL",
        "LOW_STOCK_ALERT",
        "TOP_PRODUCTS",
        "STOCK_VALUE",
      ],

      PRO: [
        "EXPORT_PDF",
        "EXPORT_EXCEL",
        "LOW_STOCK_ALERT",
        "TOP_PRODUCTS",
        "STOCK_VALUE",
        "SUPPLIER_MANAGEMENT",
        "ADVANCED_REPORTS",
        "ACCOUNTING",
        "MULTI_STORE"
      ],

      PREMIUM: [
        "EXPORT_PDF",
        "EXPORT_EXCEL",
        "LOW_STOCK_ALERT",
        "TOP_PRODUCTS",
        "STOCK_VALUE",
        "SUPPLIER_MANAGEMENT",
        "ADVANCED_REPORTS",
        // "ACCOUNTING",
        "MULTI_STORE",
        // "API_ACCESS",
      ],
    };

    for (const [planCode, featureCodes] of Object.entries(mappings)) {
      const planId = planMap[planCode];

      // Delete existing mappings
      await prisma.planFeature.deleteMany({
        where: {
          planId,
        },
      });

      // Create fresh mappings
      if (featureCodes.length > 0) {
        await prisma.planFeature.createMany({
          data: featureCodes.map((code) => ({
            planId,
            featureId: featureMap[code],
          })),
        });
      }
    }

    console.log("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Seeding failed", error);
    process.exit(1);
  }
};



// import { prisma } from "../config/prisma.js";

// export const seedDb = async () => {
//   try {
//     // =========================
//     // 1. SEED PLANS
//     // =========================
//     await prisma.plan.createMany({
//       skipDuplicates: true,
//       data: [
//         {
//           code: "FREE",
//           name: "Free",
//           price : 0,
//           maxUsers: 1,
//           maxProducts: 50,
//           maxCustomers: 20,
//           maxSalesPerMonth: 100,
//           maxStores: null,
//         },
//         {
//           code: "BASIC",
//           name: "Basic",
//           price : 2000,
//           maxUsers: 2,
//           maxProducts: 500,
//           maxSalesPerMonth: null,
//           maxStores: null,
//         },
//         {
//           code: "PRO",
//           name: "Pro",
//           maxUsers: 5,
//           price : 3000,
//           maxProducts: null,
//           maxSalesPerMonth: null,
//           maxStores: 3,
//         },
//         {
//           code: "PREMIUM",
//           name: "Premium",
//           price : 5000,
//           maxUsers: null,
//           maxProducts: null,
//           maxSalesPerMonth: null,
//           maxStores: 6,
//         },
//       ],
//     });

//     // =========================
//     // 2. SEED FEATURES
//     // =========================
//     await prisma.feature.createMany({
//       skipDuplicates: true,
//       data: [
//         { code: "EXPORT_PDF", name: "Export PDF" },
//         { code: "EXPORT_EXCEL", name: "Export Excel" },
//         { code: "LOW_STOCK_ALERT", name: "Low Stock Alert" },
//         { code: "OUT_OF_STOCK_ALERT", name: "Out of Stock" },
//         { code: "TOP_PRODUCTS", name: "Top Products" },
//         { code: "STOCK_VALUE", name: "Stock Value" },
//         { code: "SUPPLIER_MANAGEMENT", name: "Supplier Management" },
//         { code: "ADVANCED_REPORTS", name: "Advanced Reports" },
//         { code: "ACCOUNTING", name: "Accounting" },
//         { code: "MULTI_STORE", name: "Multi Store" },
//         { code: "API_ACCESS", name: "API Access" },
//       ],
//     });

//     // =========================
//     // 3. LOAD SEED DATA
//     // =========================
//     const [plans, features] = await Promise.all([
//       prisma.plan.findMany(),
//       prisma.feature.findMany(),
//     ]);

//     const planMap = Object.fromEntries(plans.map(p => [p.code, p]));
//     const featureMap = Object.fromEntries(features.map(f => [f.code, f]));

//     // =========================
//     // 4. PLAN FEATURE MAPPING
//     // =========================

//     // FREE
//     // await prisma.planFeature.createMany({
//     //   skipDuplicates: true,
//     //   data: [
//     //     {
//     //       planId: planMap.FREE.id,
//     //       featureId: featureMap.EXPORT_PDF.id,
//     //     },
//     //   ],
//     // });

//     // BASIC
//     await prisma.planFeature.createMany({
//       skipDuplicates: true,
//       data: [
//         { planId: planMap.BASIC.id, featureId: featureMap.EXPORT_PDF.id },
//         { planId: planMap.BASIC.id, featureId: featureMap.LOW_STOCK_ALERT.id },
//         { planId: planMap.BASIC.id, featureId: featureMap.TOP_PRODUCTS.id },
//         { planId: planMap.BASIC.id, featureId: featureMap.STOCK_VALUE.id },
//       ],
//     });

//     // PRO
//     await prisma.planFeature.createMany({
//       skipDuplicates: true,
//       data: [
//         { planId: planMap.PRO.id, featureId: featureMap.EXPORT_PDF.id },
//         { planId: planMap.PRO.id, featureId: featureMap.EXPORT_EXCEL.id },
//         { planId: planMap.PRO.id, featureId: featureMap.LOW_STOCK_ALERT.id },
//         { planId: planMap.PRO.id, featureId: featureMap.TOP_PRODUCTS.id },
//         { planId: planMap.PRO.id, featureId: featureMap.STOCK_VALUE.id },
//         { planId: planMap.PRO.id, featureId: featureMap.SUPPLIER_MANAGEMENT.id },
//         { planId: planMap.PRO.id, featureId: featureMap.ADVANCED_REPORTS.id },
//         { planId: planMap.PRO.id, featureId: featureMap.ACCOUNTING.id },
//       ],
//     });

//     // PREMIUM
//     await prisma.planFeature.createMany({
//       skipDuplicates: true,
//       data: [
//         { planId: planMap.PREMIUM.id, featureId: featureMap.EXPORT_PDF.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.EXPORT_EXCEL.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.LOW_STOCK_ALERT.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.TOP_PRODUCTS.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.STOCK_VALUE.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.SUPPLIER_MANAGEMENT.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.ADVANCED_REPORTS.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.ACCOUNTING.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.MULTI_STORE.id },
//         { planId: planMap.PREMIUM.id, featureId: featureMap.API_ACCESS.id },
//       ],
//     });

//     console.log("✅ Database seeded successfully");

//   } catch (e) {
//     console.error("❌ Seeding error:", e);
//         process.exit(1);
//   }
// };

