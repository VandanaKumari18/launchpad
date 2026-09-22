export type AdzunaJob = {
  external_id: string;
  title: string;
  company: string;
  location: string;
  salary_min: number | null;
  salary_max: number | null;
  description: string;
  url: string;
  posted_date: string | null;
};

export async function searchJobs(params: {
  what: string;
  where: string;
  resultsPerPage?: number;
}): Promise<AdzunaJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("Adzuna credentials are not configured");
  }

  const url = new URL("https://api.adzuna.com/v1/api/jobs/in/search/1");
  url.searchParams.set("app_id", appId);
  url.searchParams.set("app_key", appKey);
  url.searchParams.set("what", params.what);
  url.searchParams.set("where", params.where);
  url.searchParams.set(
    "results_per_page",
    String(params.resultsPerPage ?? 10)
  );

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Adzuna search failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  type AdzunaApiResult = {
    id: string;
    title: string;
    company?: { display_name?: string };
    location?: { display_name?: string };
    salary_min?: number;
    salary_max?: number;
    description: string;
    redirect_url: string;
    created?: string;
  };

  return ((data.results ?? []) as AdzunaApiResult[]).map((job) => ({
    external_id: job.id,
    title: job.title,
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? params.where,
    salary_min: job.salary_min ? Math.round(job.salary_min) : null,
    salary_max: job.salary_max ? Math.round(job.salary_max) : null,
    description: job.description,
    url: job.redirect_url,
    posted_date: job.created ? job.created.slice(0, 10) : null,
  }));
}
