import { MongoClient, type Db } from "mongodb";

const g = globalThis as unknown as { __jujMongo?: Promise<Db> };

export function db(): Promise<Db> {
  g.__jujMongo ??= new MongoClient(process.env["MONGO_URL"]!).connect().then((c) => c.db(process.env["DB_NAME"]));
  return g.__jujMongo;
}

export async function nextId(name: string): Promise<number> {
  const r = await (await db())
    .collection<{ _id: string; seq: number }>("counters")
    .findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return r!.seq;
}

export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
