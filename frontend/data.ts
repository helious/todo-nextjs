import Replicache, {
  JSONValue,
  ReadTransaction,
  WriteTransaction,
} from "replicache";
import { useSubscribe } from "replicache-react-util";
import {
  getShape,
  Shape,
  putShape,
  moveShape,
  deleteShape,
} from "../shared/shape";
import {
  getClientState,
  overShape,
  initClientState,
  setCursor,
  keyPrefix as clientStatePrefix,
  selectShape,
} from "../shared/client-state";
import type Storage from "../shared/storage";
import type { UserInfo } from "../shared/client-state";
import { newID } from "../shared/id";

/**
 * Abstracts Replicache storage (key/value pairs) to entities (Shape).
 */
export type Data = ReturnType<typeof createData>;

export function createData(rep: Replicache) {
  // TODO: Use clientID from Replicache:
  // https://github.com/rocicorp/replicache-sdk-js/issues/275
  let clientID = localStorage.clientID;
  if (!clientID) {
    clientID = localStorage.clientID = newID();
  }

  function subscribe<T extends JSONValue>(
    def: T,
    f: (tx: ReadTransaction) => Promise<T>
  ): T {
    return useSubscribe(rep, f, def);
  }

  return {
    clientID,

    // mutators
    createShape: rep.register(
      "createShape",
      async (tx: WriteTransaction, args: { id: string; shape: Shape }) => {
        await putShape(writeStorage(tx), args);
      }
    ),

    deleteShape: rep.register(
      "deleteShape",
      async (tx: WriteTransaction, id: string) => {
        await deleteShape(writeStorage(tx), id);
      }
    ),

    moveShape: rep.register(
      "moveShape",
      async (
        tx: WriteTransaction,
        args: { id: string; dx: number; dy: number }
      ) => {
        await moveShape(writeStorage(tx), args);
      }
    ),

    initClientState: rep.register(
      "initClientState",
      async (
        tx: WriteTransaction,
        args: { id: string; defaultUserInfo: UserInfo }
      ) => {
        await initClientState(writeStorage(tx), args);
      }
    ),

    setCursor: rep.register(
      "setCursor",
      async (
        tx: WriteTransaction,
        args: { id: string; x: number; y: number }
      ) => {
        await setCursor(writeStorage(tx), args);
      }
    ),

    overShape: rep.register(
      "overShape",
      async (
        tx: WriteTransaction,
        args: { clientID: string; shapeID: string }
      ) => {
        await overShape(writeStorage(tx), args);
      }
    ),

    selectShape: rep.register(
      "selectShape",
      async (
        tx: WriteTransaction,
        args: { clientID: string; shapeID: string }
      ) => {
        await selectShape(writeStorage(tx), args);
      }
    ),

    // subscriptions
    useShapeIDs: () =>
      subscribe([], async (tx: ReadTransaction) => {
        const shapes = await tx.scanAll({ prefix: "shape-" });
        return shapes.map(([k, _]) => k.split("-")[1]);
      }),

    useShapeByID: (id: string) =>
      subscribe(null, (tx: ReadTransaction) => {
        return getShape(readStorage(tx), id);
      }),

    useUserInfo: (clientID: string) =>
      subscribe(null, async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).userInfo;
      }),

    useOverShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).overID;
      }),

    useSelectedShapeID: () =>
      subscribe("", async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).selectedID;
      }),

    useCollaboratorIDs: (clientID: string) =>
      subscribe([], async (tx: ReadTransaction) => {
        const r = [];
        for await (let k of tx.scan({ prefix: clientStatePrefix }).keys()) {
          if (!k.endsWith(clientID)) {
            r.push(k.substr(clientStatePrefix.length));
          }
        }
        return r;
      }),

    useCursor: (clientID: string) =>
      subscribe(null, async (tx: ReadTransaction) => {
        return (await getClientState(readStorage(tx), clientID)).cursor;
      }),
  };
}

function readStorage(tx: ReadTransaction): Storage {
  return {
    getObject: tx.get.bind(tx),
    putObject: () => {
      throw new Error("Cannot write inside ReadTransaction");
    },
    delObject: () => {
      throw new Error("Cannot delete inside ReadTransaction");
    },
  };
}

function writeStorage(tx: WriteTransaction): Storage {
  return Object.assign(readStorage(tx), {
    putObject: tx.put.bind(tx),
    delObject: tx.del.bind(tx),
  });
}