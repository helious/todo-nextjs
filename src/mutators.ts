// This file defines our "mutators".
//
// Mutators are how you change data in Replicache apps.
//
// They are registered with Replicache at construction-time and callable like:
// `myReplicache.mutate.createTodo({text: "foo"})`.
//
// Replicache runs each mutation immediately (optimistically) on the client,
// against the local cache, and then later (usually moments later) sends a
// description of the mutation (its name and arguments) to the server, so that
// the server can *re-run* the mutation there against the authoritative
// datastore.
//
// This re-running of mutations is how Replicache handles conflicts: the
// mutators defensively check the database when they run and do the appropriate
// thing. The Replicache sync protocol ensures that the server-side result takes
// precedence over the client-side optimistic result.
//
// If the server is written in JavaScript, the mutator functions can be directly
// reused on the server. This sample demonstrates the pattern by using these
// mutators both with Replicache on the client (see [id]].tsx) and on the server
// (see pages/api/replicache/[op].ts).
//
// See https://doc.replicache.dev/how-it-works#sync-details for all the detail
// on how Replicache syncs and resolves conflicts, but understanding that is not
// required to get up and running.
import { WriteTransaction } from "replicache";
import { Todo, TodoUpdate } from "./todo";
import { nanoid } from "nanoid";

export type M = typeof mutators;

export const mutators = {
  updateTodo: async (tx: WriteTransaction, update: TodoUpdate) => {
    // In a real app you may want to validate the incoming data is in fact a
    // TodoUpdate. Check out https://www.npmjs.com/package/@rocicorp/rails for
    // some heper functions to do this.
    const prev = await tx.get<Todo>(update.id);
    const next = { ...prev, ...update };
    await tx.set(next.id, next);
  },

  deleteTodo: async (tx: WriteTransaction, id: string) => {
    await tx.del(id);
  },

  populate: async (tx: WriteTransaction, num: number) => {
    for (let i = 0; i < num; i++) {
      const id = nanoid(40);
      await tx.set(id, {
        id,
        text: `text: ${id}`,
        cutsheetEntityID: nanoid(40),
        parentEntityID: nanoid(40),
        completed: false,
        cutsheetEntity: {
          sort: 0,
          type: null,
          title: nanoid(15),
          deleted: false,
          stateType: nanoid(7),
          description: null,
          owningEntityID: nanoid(40),
          storageMetadataID: nanoid(40),
        },
        tenantID: nanoid(6),
        createdAt: nanoid(24),
        updatedAt: nanoid(24),
        updatedBy: "lambda",
        updatedSource: "lambda",
        deleted: false,
        version: 1,
        isActive: true,
        modified: false,
      });
    }
  },
};
