import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const v = process.env.XENDIT_SECRET_KEY || "";
  res.json({
    hasXendit: !!v,
    prefix: v ? v.slice(0, 20) : null,
    length: v ? v.length : 0,
  });
}
