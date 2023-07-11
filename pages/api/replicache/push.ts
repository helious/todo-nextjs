import { transact } from "../../../src/backend/pg";
import {
  getCookie,
  getLastMutationID,
  setCookie,
  setLastMutationID,
} from "../../../src/backend/data";
import { ReplicacheTransaction } from "replicache-transaction";
import { z } from "zod";
import { PostgresStorage } from "../../../src/backend/postgres-storage";
import { mutators } from "../../../src/mutators";
import { NextApiRequest, NextApiResponse } from "next/types";

const mutationSchema = z.object({
  id: z.number(),
  name: z.string(),
  args: z.any(),
});

const pushRequestSchema = z.object({
  clientID: z.string(),
  mutations: z.array(mutationSchema),
});

export default async function (req: NextApiRequest, res: NextApiResponse) {
  const { body: requestBody } = req;

  console.log("Processing push", JSON.stringify(requestBody, null, ""));

  const push = pushRequestSchema.parse(requestBody);

  const t0 = Date.now();
  await transact(async (executor) => {
    const prevVersion = await getCookie(executor);

    const nextVersion = prevVersion + 1;
    let lastMutationID =
      (await getLastMutationID(executor, push.clientID)) ?? 0;

    console.log("prevVersion: ", prevVersion);
    console.log("lastMutationID:", lastMutationID);

    const storage = new PostgresStorage(nextVersion, executor);
    const tx = new ReplicacheTransaction(storage, push.clientID);

    for (let i = 0; i < push.mutations.length; i++) {
      const mutation = push.mutations[i];
      const expectedMutationID = lastMutationID + 1;

      if (mutation.id < expectedMutationID) {
        console.log(
          `Mutation ${mutation.id} has already been processed - skipping`
        );
        continue;
      }
      if (mutation.id > expectedMutationID) {
        console.warn(`Mutation ${mutation.id} is from the future - aborting`);
        break;
      }

      console.log("Processing mutation:", JSON.stringify(mutation, null, ""));

      const t1 = Date.now();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mutator = (mutators as any)[mutation.name];
      if (!mutator) {
        console.error(`Unknown mutator: ${mutation.name} - skipping`);
      }

      try {
        await mutator(tx, mutation.args);
      } catch (e) {
        console.error(
          `Error executing mutator: ${JSON.stringify(mutator)}: ${e}`
        );
      }

      lastMutationID = expectedMutationID;
      console.log("Processed mutation in", Date.now() - t1);
    }

    await Promise.all([
      setLastMutationID(executor, push.clientID, lastMutationID),
      setCookie(executor, nextVersion),
      tx.flush(),
    ]);

    // No need to explicitly poke, Supabase realtime stuff will fire a change.
  });

  console.log("Processed all mutations in", Date.now() - t0);

  res.status(200).json({});
}