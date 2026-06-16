import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard/",
          "/onboarding",
          "/analytics",
          "/campaigns",
          "/inbox",
          "/tasks",
          "/dialer",
          "/find-leads",
          "/signals",
          "/website-visitors",
          "/lists",
          "/leads",
          "/sequences",
          "/settings",
          "/calendar",
          "/deliverability",
          "/integrations",
        ],
      },
    ],
    sitemap: "https://aryasdr.in/sitemap.xml",
    host: "https://aryasdr.in",
  };
}
