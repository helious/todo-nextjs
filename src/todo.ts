// This file defines our Todo domain type in TypeScript, and a related helper
// function to get all Todos. You'd typically have one of these files for each
// domain object in your application.

import { ReadTransaction } from "replicache";

export type Todo = {
  readonly id: string;
  readonly text: string;
  readonly completed: boolean;
  readonly sort: number;

  readonly cutsheetEntityID: string;
  readonly parentEntityID: string;
  readonly cutsheetEntity: {
    readonly sort: number;
    readonly type: string | null;
    readonly title: string;
    readonly deleted: boolean;
    readonly stateType: string;
    readonly description: string;
    readonly owningEntityID: string;
    readonly storageMetadataID: string;
  };
  readonly tenantID: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly updatedBy: string;
  readonly updatedSource: string;
  readonly deleted: boolean;
  readonly version: number;
  readonly isActive: boolean;
  readonly modified: boolean;
};

export type TodoUpdate = Partial<Todo> & Pick<Todo, "id">;

export async function listTodos(tx: ReadTransaction) {
  return await tx.scan<Todo>().values().toArray();
}
