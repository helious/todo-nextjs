import React from "react";
import { ReadTransaction, ReadonlyJSONValue, Replicache } from "replicache";

import { M } from "../mutators";
import { Todo } from "src/todo";
import { useSubscribe } from "replicache-react";

async function write(rep: Replicache<M>) {
  const num = 15_000;
  const t0 = Date.now();
  await rep.mutate.populate(num);
  const t1 = Date.now();
  alert(`Populated ${num} in ${t1 - t0}ms`);
}

async function writeOne(rep: Replicache<M>) {
  await rep.mutate.populate(1);
}

async function read(rep: Replicache<M>) {
  let count = 0;
  let idBytes = 0;
  const start = Date.now();
  const d = await rep.query(async (tx) => {
    for await (const e of tx.scan({ prefix: "CSI" }).entries()) {
      count++;
      idBytes += (e[0] as string).length + (e[1] as Todo).id.length;
    }
    return {
      count,
      idBytes,
    };
  });
  const end = Date.now();
  const time = end - start;
  alert(
    `Scanned ${d.count} with ${d.idBytes} id bytes in ${time}ms` +
      "\n\n" +
      `Average: ${d.count / time} items per ms, or roughly ${
        ((d.count * 800) / time / 1000 / 1000) * 1000
      } MB per second`
  );
}

async function readToArray(rep: Replicache<M>) {
  const start = Date.now();
  const d = await rep.query(async (tx) => {
    return await tx.scan().entries().toArray();
  });
  const end = Date.now();
  const time = end - start;
  alert(
    `Read ${d.length} in ${time}ms` +
      "\n\n" +
      `Average: ${d.length / time} items per ms, or roughly ${
        ((d.length * 800) / time / 1000 / 1000) * 1000
      } MB per second`
  );
}

let lastTimeToRead = 0;

// This is the top-level component for our app.
const App = ({ rep }: { rep: Replicache<M> }) => {
  const count = useSubscribe(rep, async (tx: ReadTransaction) => {
    const now = new Date().getTime();
    let count = 0;
    
    for await (const [id, entry] of tx.scan({ prefix: "CSI" }).entries()) {
      if (id) {
        count++;
      }
    }

    lastTimeToRead = (new Date().getTime() - now) / 1000;

    return count;
  });

  return (
    <div>
      <button
        onClick={async (event) => {
          event.preventDefault();
          await write(rep);
        }}
      >
        Write
      </button>
      &nbsp;
      <button
        onClick={async (event) => {
          event.preventDefault();
          await writeOne(rep);
        }}
      >
        Write One
      </button>
      &nbsp;
      <button
        onClick={async (event) => {
          event.preventDefault();
          await read(rep);
        }}
      >
        Read
      </button>
      &nbsp;
      <button
        onClick={async (event) => {
          event.preventDefault();
          await readToArray(rep);
        }}
      >
        Read to Array
      </button>
      <p>
        {count} items in {lastTimeToRead}s
      </p>
    </div>
  );
};

export default App;
