import React from "react";
import { Replicache } from "replicache";

import { M } from "../mutators";
import { Todo } from "src/todo";

async function write(rep: Replicache<M>) {
  const num = 15_000;
  const t0 = Date.now();
  await rep.mutate.populate(num);
  const t1 = Date.now();
  alert(`Populated ${num} in ${t1 - t0}ms`);
}

async function read(rep: Replicache<M>) {
  let count = 0;
  let idBytes = 0;
  const start = Date.now();
  const d = await rep.query(async (tx) => {
    for await (const e of tx.scan().entries()) {
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

// This is the top-level component for our app.
const App = ({ rep }: { rep: Replicache<M> }) => {
  return (
    <div>
      <button onClick={() => write(rep)}>Write</button>&nbsp;
      <button onClick={() => read(rep)}>Read</button>&nbsp;
      <button onClick={() => readToArray(rep)}>Read to Array</button>
    </div>
  );
};

export default App;
