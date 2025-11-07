import { json, type RequestHandler } from "@sveltejs/kit";
import { PUBLIC_PASSWORD_ENCRYPTED } from "$env/static/public";
import crypto from "crypto";

function encryptSHA256(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function checkPassword(password: string) {
  const hash = encryptSHA256(password);
  return hash === PUBLIC_PASSWORD_ENCRYPTED;
}

export const POST: RequestHandler = async ({ request }) => {
  const { password } = await request.json();

  if (!password || typeof password !== "string") {
    return json(
      { success: false, error: "Password is required." },
      { status: 400 }
    );
  }

  if (checkPassword(password)) {
    return json({ success: true });
  }

  return json(
    { success: false, error: "Incorrect password." },
    { status: 401 }
  );
};

