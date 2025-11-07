import type { PageServerLoad } from "./$types";

const ADMIN_PASSWORD = "wesleyjacobcheung";

export const load: PageServerLoad = async () => {
  return {
    adminPassword: ADMIN_PASSWORD,
  };
};
