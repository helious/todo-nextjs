import React, { useState } from "react";
import { ReadTransaction, Replicache } from "replicache";

import { M } from "../mutators";
import { useSubscribe } from "replicache-react";

async function populate(rep: Replicache<M>) {
  const num = 15_000;
  const t0 = Date.now();
  await rep.mutate.populate(num);
  const t1 = Date.now();
  alert(`Populated ${num} in ${t1 - t0}ms`);
}

async function write(rep: Replicache<M>) {
  await rep.mutate.createTodo();
}

async function readToArray(tx: ReadTransaction) {
  const start = Date.now();
  const d = await tx.scan().entries().toArray();
  const end = Date.now();
  const time = end - start;
  return {
    d,
    time,
  };
}

// This is the top-level component for our app.
const App = ({ rep }: { rep: Replicache<M> }) => {
  const [s, setState] = useState({});
  const arrayResult = useSubscribe(rep, readToArray, {
    default: null,
    dependencies: [s],
  });

  const forceUpdate = () => {
    setState({});
  };

  if (!arrayResult) {
    return null;
  }

  const { d: arrayData, time: arrayTime } = arrayResult;

  return (
    <>
      <div>
        <button onClick={() => populate(rep)}>Populate</button>&nbsp;
        <button onClick={() => write(rep)}>Write</button>&nbsp;
        <button onClick={() => forceUpdate()}>Read</button>
      </div>
      <div>
        <h2>ReadToArray</h2>
        <p>
          {arrayData.length} items, {arrayTime}ms
          <br />
          {arrayData.length / arrayTime} items/ms,{" "}
          {(((arrayData.length / arrayTime) * 800) / 1024 / 1024) * 1000} MB/s
          <br />~{JSON.stringify(arrayData).length / 1024 / 1024} MB result
        </p>
      </div>
    </>
  );
};

export default App;
