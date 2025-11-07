import type { PageServerLoad } from "./$types";

// Simple password - change this to whatever you want
const ADMIN_PASSWORD = "wesleyjacobcheung";

export const load: PageServerLoad = async () => {
  return {
    adminPassword: ADMIN_PASSWORD,
  };
};
