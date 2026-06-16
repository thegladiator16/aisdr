import type { MetadataRoute } from "next";

const SITE = "https://aryasdr.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages = [
    { path: "", priority: 1.0, change: "weekly" as const },
    { path: "/pricing", priority: 0.9, change: "weekly" as const },
    { path: "/features", priority: 0.8, change: "monthly" as const },
    { path: "/contact", priority: 0.7, change: "monthly" as const },
    { path: "/solutions/enterprise", priority: 0.7, change: "monthly" as const },
    { path: "/solutions/smb", priority: 0.7, change: "monthly" as const },
    { path: "/solutions/startups", priority: 0.7, change: "monthly" as const },
    { path: "/sign-in", priority: 0.5, change: "yearly" as const },
    { path: "/sign-up", priority: 0.6, change: "yearly" as const },
    { path: "/privacy", priority: 0.3, change: "yearly" as const },
    { path: "/terms", priority: 0.3, change: "yearly" as const },
  ];

  return pages.map((p) => ({
    url: `${SITE}${p.path}`,
    lastModified: now,
    changeFrequency: p.change,
    priority: p.priority,
  }));
}
