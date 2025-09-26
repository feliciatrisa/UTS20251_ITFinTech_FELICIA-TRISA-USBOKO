import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  throw new Error(
    "Missing MONGODB_URI (set in Vercel → Project → Settings → Environment Variables)"
  );
}

// Cache koneksi supaya tidak reconnect terus di serverless
type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// deklarasikan variable global dengan tipe yang benar (tanpa any)
declare global {
  var __mongoose_cache__: MongooseCache | undefined;
}

const cached: MongooseCache = global.__mongoose_cache__ ?? { conn: null, promise: null };

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  // simpan kembali ke global agar dipakai invocation berikutnya
  global.__mongoose_cache__ = cached;
  return cached.conn;
}

export default dbConnect;
